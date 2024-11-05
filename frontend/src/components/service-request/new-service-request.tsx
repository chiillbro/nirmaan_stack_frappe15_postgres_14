import { useFrappeCreateDoc, useFrappeGetDoc, useFrappeGetDocList, useSWRConfig } from "frappe-react-sdk";
import { Projects as ProjectsType } from "@/types/NirmaanStack/Projects";
import { useNavigate, useParams } from "react-router-dom";
import { NewPRSkeleton } from "../ui/skeleton";
import { useUserData } from "@/hooks/useUserData";
import { useToast } from "../ui/use-toast";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCheck, CirclePlus, ListChecks, Pencil, Replace, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../ui/card";
import imageUrl from "@/assets/user-icon.jpeg"
import { Category as CategoryType } from "@/types/NirmaanStack/Category";
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogFooter, DialogHeader, DialogClose, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { TailSpin } from "react-loader-spinner";




const NewSR = () => {

    const { project } = useParams<{ project: string }>();


    const { data: project_data, isLoading: project_loading, error: project_error } = useFrappeGetDoc<ProjectsType>("Projects", project, project ? undefined : null);

    const { data: category_data, isLoading: category_loading, error: category_error } = useFrappeGetDocList<CategoryType>("Category", {
        fields: ["*"],
        filters: [['work_package', '=', 'Services']],
        orderBy: { field: 'name', order: 'asc' }
    })

    return (
        <>  {(project_loading || category_loading) ? <NewPRSkeleton /> : <NewSRPage project={project_data} category={category_data} />}
            {(project_error || category_error) && <h1>ERROR</h1>}
        </>
    )
};

interface NewSRPageProps {
    project?: ProjectsType | undefined
    category?: any
    // rejected_pr_data?: any
    // setSection?: any
}

const NewSRPage = ({ project, category }: NewSRPageProps) => {
    const userData = useUserData()
    const { toast } = useToast()
    const navigate = useNavigate()

    const [page, setPage] = useState<string>('categorylist')
    const [categories, setCategories] = useState<{ list: { name: string }[] }>({ list: [] })
    const [curCategory, setCurCategory] = useState<string>("")
    const [curDesc, setCurDesc] = useState("")
    const [editDesctiption, setEditDescription] = useState("")
    const [orderList, setOrderList] = useState<{ list: { category: string, description: string }[] }>({ list: [] })

    const { createDoc: createDoc, loading: createLoading, isCompleted: submit_complete, error: submit_error } = useFrappeCreateDoc()

    useEffect(() => {
        const newCategories: { name: string }[] = [];
        orderList.list.map((item) => {
            const isDuplicate = newCategories.some(category => category.name === item.category);
            if (!isDuplicate) {
                newCategories.push({ name: item.category })
            }
        })
        setCategories({ list: newCategories });
    }, [orderList]);

    const addCategory = (categoryName: string) => {
        setCurCategory(categoryName);
        // setTax(category?.find((category) => category.category_name === categoryName).tax)
        const isDuplicate = categories.list.some(category => category.name === categoryName);
        if (!isDuplicate) {
            setCategories(prevState => ({
                ...prevState,
                list: [...prevState.list, { name: categoryName }]
            }));
        }
        console.log(categories)
    };

    const handleCategoryClick = (category: string, value: string) => {
        addCategory(category);
        setPage(value);

    };

    const handleAdd = () => {

        const service_object: { category: string, description: string } = { category: "", description: "" }
        service_object.category = curCategory
        service_object.description = curDesc
        const newOrderList = { list: [...orderList.list, service_object] }
        setOrderList(newOrderList)
        console.log("Added order obj:", orderList)
        setCurDesc("")
    }
    const handleDelete = (description: string) => {
        let curRequest = orderList.list;
        // let itemToPush = curRequest.find(curValue => curValue.description === description);

        // setStack(prevStack => [...prevStack, itemToPush]);
        curRequest = curRequest.filter(curValue => curValue.description !== description);
        setOrderList({
            list: curRequest
        });
        // setComments(prev => {
        //     delete prev[item]
        //     return prev
        // })
        // setQuantity('')
        setCurDesc('')
    }
    const handleSave = (itemDescription: string) => {
        // let curRequest = orderList.list;
        // let newRequest = orderList.list.find(item => item.description===itemDescription)
        // console.log("comments of item name", comments[itemName])
        // curRequest = curRequest.map((curValue) => {
        //     if (curValue.item === itemName) {
        //         return { ...curValue, quantity: parseInt(newQuantity), comment: comments[itemName] === undefined ? curValue.comment || "" : comments[itemName] || "" };
        //     }
        //     return curValue;
        // });
        setOrderList(prevState => ({
            list: prevState.list.map(item =>
                item.description === itemDescription
                    ? { ...item, description: editDesctiption }
                    : item
            )
        }));
        setCurDesc('')
    };

    const { mutate } = useSWRConfig()

    // console.log("quantity", quantity)

    const handleSubmit = async () => {
        if (
            userData?.role === "Nirmaan Project Manager Profile" ||
            userData?.role === "Nirmaan Admin Profile" ||
            userData?.role === "Nirmaan Procurement Executive Profile" ||
            userData?.role === "Nirmaan Project Lead Profile"
        ) {
            try {
                const res = await createDoc('Service Requests', {
                    project: project?.name,
                    service_order_list: orderList,
                    service_category_list: categories,
                    status: "Created"
                });

                // if (universalComment) {
                //     await createDoc("Nirmaan Comments", {
                //         comment_type: "Comment",
                //         reference_doctype: "Procurement Requests",
                //         reference_name: res.name,
                //         comment_by: userData?.user_id,
                //         content: universalComment,
                //         subject: "creating pr"
                //     })
                // }
                // console.log("newPR", res);
                await mutate("Service Requests,orderBy(creation-desc)");

                document.getElementById("dialogCloseforNewPR")?.click()
                toast({
                    title: "Success!",
                    description: `New SR: ${res?.name} created successfully!`,
                    variant: "success",
                });

                navigate(-1);
            } catch (error) {
                console.log("submit_error", error);

                toast({
                    title: "Failed!",
                    description: `SR Creation failed!`,
                    variant: "destructive",
                });
            }
        }
    };

    return (
        <>
            {(page == 'categorylist') && <div className="flex-1 md:space-y-4">
                <div className="flex items-center pt-1 pb-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <ArrowLeft className="cursor-pointer" />
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>Are you sure?</DialogHeader>
                            <DialogDescription>This action will clear out the service order list. Are you sure you want to continue?</DialogDescription>
                            <DialogFooter>
                                <DialogClose asChild><Button>Cancel</Button></DialogClose>
                                <Button onClick={() => navigate(-1)} >Continue</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <h3 className="text-base pl-2 font-bold tracking-tight">Select Service Category</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {category?.map((item: CategoryType) => (
                        <Card className="flex flex-col items-center shadow-none text-center border border-grey-500 hover:animate-shadow-drop-center" onClick={() => handleCategoryClick(item.name, 'orderlist')} key={item.name}>
                            <CardHeader className="flex flex-col items-center justify-center space-y-0 p-2">
                                <CardTitle className="flex flex-col items-center text-sm font-medium text-center">
                                    <img className="h-32 md:h-36 w-32 md:w-36 rounded-lg p-0" src={item.name === null ? imageUrl : item.image_url} alt="Category" />
                                    <span>{item.name}</span>
                                </CardTitle>
                                {/* {console.log("FROM WP:", item.work_package_image)} */}
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>}
            {/* {page === 'order' && (categories.list.map((item) => { return (<div>Hello <b>{item.name}</b></div>) }))} */}
            {page == 'orderlist' && <div className="flex-1 space-y-2 md:space-y-4">
                <div className="flex items-center gap-1 pb-4">
                    <ArrowLeft className="cursor-pointer" onClick={() => {
                        setCurDesc("")
                        setPage('categorylist')
                    }} />

                    <h2 className="text-base pl-2 font-bold tracking-tight">Add Services</h2>

                </div>
                <div className="flex justify-between max-md:pr-10 md:justify-normal md:space-x-40">
                    <div className="">
                        <h5 className="text-gray-500 text-xs md:test-base">Project</h5>
                        <h3 className=" font-semibold text-sm md:text-lg">{project && project?.project_name}</h3>
                    </div>
                    <div className="">
                        <h5 className="text-gray-500 text-xs md:test-base">Package</h5>
                        <h3 className=" font-semibold text-sm md:text-lg">Services</h3>
                    </div>
                </div>
                <div className="flex justify-between">
                    <button className="text-sm py-2 md:text-lg text-blue-400 flex items-center gap-1" onClick={() => {
                        setCurDesc("")
                        // setMake("")
                        // setQuantity(null)
                        setPage('categorylist')
                    }}><Replace className="w-5 h-5" />Change Category</button>
                </div>
                <h3 className="font-bold">{curCategory}</h3>
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="message">Service Description</Label>
                    <Textarea placeholder={`Add ${curCategory} Description...`} id="service_description" onChange={(e: any) => setCurDesc(e.target.value === "" ? null : e.target.value)} value={curDesc} />
                </div>
                <div className="flex justify-right md:space-x-0 mt-2">
                    {/* <button className="text-sm py-2 md:text-lg text-blue-400 flex items-center gap-1" onClick={() => handleCreateItem()}><CirclePlus className="w-5 h-5" />Create new item</button> */}
                    {(curDesc !== "") ?
                        <Button variant="default" className="flex items-center gap-1" onClick={() => handleAdd()}> <CirclePlus className="w-4 h-4" />Add</Button>
                        :
                        <Button disabled={true} variant="outline" className="border-primary flex items-center gap-1 disabled:opacity-[30%]"><CirclePlus className="w-4 h-4" /> Add</Button>}
                </div>
                <div className="flex justify-between items-center max-md:py-4">
                    <p className="max-md:text-xs text-rose-700">Added Services</p>
                    {/* {stack.length !== 0 && (
                        <div className="flex items-center space-x-2">
                            <HoverCard>
                                <HoverCardTrigger>
                                    <button
                                        onClick={() => UndoDeleteOperation()}
                                        className="flex items-center max-md:text-sm max-md:px-2 max-md:py-1  px-4 py-2 bg-blue-500 text-white font-semibold rounded-full shadow-md hover:bg-blue-600 transition duration-200 ease-in-out"
                                    >
                                        <Undo className="mr-2 max-md:w-4 max-md:h-4" /> 
                                        Undo
                                    </button>
                                </HoverCardTrigger>
                                <HoverCardContent className="bg-gray-800 text-white p-2 rounded-md shadow-lg mr-[100px]">
                                    Click to undo the last deleted operation
                                </HoverCardContent>
                            </HoverCard>
                        </div>
                    )} */}
                </div>
                {
                    categories.list.length ? (
                        categories.list?.map((cat) => {
                            return <div className="container mb-4 mx-0 px-0">
                                <h3 className="text-sm font-semibold py-2">{cat.name}</h3>
                                <table className="table-auto md:w-full">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="w-[15%] text-left px-4 py-1 text-xs">Service Category</th>
                                            <th className="w-[75%] px-4 py-1 text-xs text-left">Service Description</th>
                                            <th className="w-[10%] px-4 py-1 text-xs text-center">Edit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderList.list?.map((item) => {
                                            if (item.category === cat.name) {
                                                return <tr key={item.description} >
                                                    <td className="w-[15%] text-left border-b-2 px-4 py-1 text-sm">
                                                        {item.category}
                                                    </td>
                                                    <td className="w-[75%] border-b-2 px-4 py-1 text-sm text-left">{item.description}</td>
                                                    <td className="w-[10%] border-b-2 px-4 py-1 text-sm text-center">
                                                        <Dialog>
                                                            <DialogTrigger><Pencil className="w-4 h-4" onClick={() => setEditDescription(item.description)} /></DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle className="flex justify-between">Edit Item</DialogTitle>
                                                                    <DialogDescription className="flex flex-col gap-2">
                                                                        <div className="flex space-x-2">
                                                                            <div className="w-1/2 md:w-2/3">
                                                                                <h5 className="text-base text-gray-400 text-left mb-1">Service Description</h5>
                                                                                <div className="w-full  p-1 text-left">
                                                                                    <Textarea placeholder={`Add ${curCategory} Description...`} onChange={(e: any) => setEditDescription(e.target.value === "" ? null : e.target.value)} value={editDesctiption} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </DialogDescription>
                                                                    <DialogDescription className="flex justify-end">
                                                                        <div className="flex gap-2">
                                                                            <Button className="bg-gray-100 text-black hover:text-white flex items-center gap-1" onClick={() => handleDelete(item.description)}><Trash2 className="h-4 w-4" /> Delete</Button>
                                                                            <Button onClick={() => handleSave(item.description)}
                                                                                className="flex items-center gap-1"
                                                                            ><ListChecks className="h-4 w-4" />Update</Button>
                                                                        </div>
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </td>
                                                </tr>
                                            }
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        })
                    ) : <div className="text-center bg-gray-100 p-2 text-gray-600">
                        Empty!
                    </div>
                }

                {/* <Card className="flex flex-col items-start shadow-none border border-grey-500 p-3">
                    <h3 className="font-bold flex items-center gap-1"><MessageCircleMore className="w-5 h-5" />Comments</h3>
                    {rejected_pr_data && (
                        <div className="py-4 w-full flex flex-col gap-2">
                            {
                                universalComments?.filter((comment) => managersIdList?.includes(comment.comment_by) || (comment.comment_by === "Administrator" && comment.subject === "rejecting pr")).map((cmt) => (
                                    <>
                                        <div key={cmt.name} className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg">
                                            <Avatar>
                                                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${cmt.comment_by}`} />
                                                <AvatarFallback>{cmt.comment_by[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-gray-900">{cmt.content}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-sm text-gray-500">
                                                        {cmt.comment_by === "Administrator" ? "Administrator" : getFullName(cmt.comment_by)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {formatDate(cmt.creation.split(" ")[0])} {cmt.creation.split(" ")[1].substring(0, 5)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ))}
                        </div>
                    )}
                    <textarea className="w-full border rounded-lg p-2 min-h-12" placeholder={`${rejected_pr_data ? "Write Resolving Comments here..." : "Write comments here..."}`} value={universalComment || ""} onChange={(e) => handleCommentChange(e)} />
                </Card> */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button disabled={!orderList.list.length ? true : false} variant={`${!orderList.list.length ? "secondary" : "destructive"}`} className="h-8 mt-4 w-full"><div className="flex items-center gap-1"><ListChecks className="h-4 w-4" />Submit</div></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Are you Sure?</DialogTitle>
                            <DialogDescription>
                                If there is any pending PR created by you with the same Project & Package, then the older PRs will be merged with this PR. Are you sure you want to continue?"
                            </DialogDescription>
                        </DialogHeader>
                        <DialogDescription className="flex justify-center">
                            {
                                createLoading ? <TailSpin width={60} color={"red"} /> :
                                    <Button onClick={handleSubmit} className="flex items-center gap-1">
                                        <CheckCheck className="h-4 w-4" />
                                        Confirm</Button>
                            }
                        </DialogDescription>

                        <DialogClose className="hidden" id="dialogCloseforNewPR">Close</DialogClose>
                    </DialogContent>
                </Dialog>
            </div>}
        </>
    )
}

export const Component = NewSR;