import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useFrappeGetDocList, useFrappeGetDoc, useFrappeUpdateDoc, useFrappeCreateDoc, useFrappeDeleteDoc } from "frappe-react-sdk";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react"
import { ArrowLeft, CheckCheck, Undo2, X } from 'lucide-react';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/utils/FormatDate";
import { ProcurementOrders as ProcurementOrdersType } from "@/types/NirmaanStack/ProcurementOrders";
import { Projects as ProjectsType } from "@/types/NirmaanStack/Projects";
import { NirmaanUsers as NirmaanUsersType } from "@/types/NirmaanStack/NirmaanUsers";
import { NirmaanVersions as NirmaanVersionsType } from "@/types/NirmaanStack/NirmaanVersions";
import TextArea from "antd/es/input/TextArea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserData } from "@/hooks/useUserData";
import { TailSpin } from "react-loader-spinner";
import { ProcurementActionsHeaderCard } from "@/components/ui/ProcurementActionsHeaderCard";

const ApproveAmendSO = () => {

    const { soId } = useParams<{ soId: string }>()

    const [project, setProject] = useState<String | undefined>()
    const [owner, setOwner] = useState<String | undefined>()
    const { data: so_data, isLoading: so_data_loading, error: so_data_error } = useFrappeGetDoc<ProcurementOrdersType>("Service Requests", soId, `Service Requests ${soId}`);
    const { data: project_data, isLoading: project_loading, error: project_error } = useFrappeGetDoc<ProjectsType>("Projects", project, project ? undefined : null);
    const { data: owner_data, isLoading: owner_loading, error: owner_error } = useFrappeGetDoc<NirmaanUsersType>("Nirmaan Users", owner, owner ? (owner === "Administrator" ? null : undefined) : null);

    const { data: usersList, isLoading: usersListLoading, error: usersListError } = useFrappeGetDocList("Nirmaan Users", {
        fields: ["name", "full_name"],
        limit: 1000
    })

    const { data: versions, isLoading: versionsLoading, error: versionsError } = useFrappeGetDocList("Nirmaan Versions", {
        fields: ["*"],
        filters: [["ref_doctype", "=", "Service Requests"], ["docname", "=", soId]],
        limit: 1000,
        orderBy: { field: "creation", order: "desc" }
    })

    useEffect(() => {
        if (so_data) {
            setProject(so_data?.project)
            setOwner(so_data?.owner)
        }
    }, [so_data])

    const navigate = useNavigate()

    const getUserName = (id) => {
        if (usersList) {
            return usersList.find((user) => user?.name === id)?.full_name
        }
    }

    // console.log("within 1st component", owner_data)
    if (so_data_loading || project_loading || owner_loading || versionsLoading) return <div className="flex items-center h-[90vh] w-full justify-center"><TailSpin color={"red"} /> </div>
    if (so_data_error || project_error || owner_error || versionsError) return <h1>Error</h1>
    if (so_data?.status !== "Amendment") return (
        <div className="flex items-center justify-center h-[90vh]">
            <div className="bg-white shadow-lg rounded-lg p-8 max-w-lg w-full text-center space-y-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                    Heads Up!
                </h2>
                <p className="text-gray-600 text-lg">
                    Hey there, the Service Order:{" "}
                    <span className="font-medium text-gray-900">{so_data?.name}</span>{" "}
                    is no longer available for{" "}
                    <span className="italic">Amending</span>. The current state is{" "}
                    <span className="font-semibold text-blue-600">
                        {so_data?.status}
                    </span>{" "}
                    And the last modification was done by <span className="font-medium text-gray-900">
                        {so_data?.modified_by === "Administrator" ? so_data?.modified_by : getUserName(so_data?.modified_by)}
                    </span>
                    !
                </p>
                <button
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-300"
                    onClick={() => navigate("/approve-amended-so")}
                >
                    Go Back
                </button>
            </div>
        </div>
    );
    return (
        <ApproveAmendSOPage so_data={so_data} project_data={project_data} versionsData={versions} owner_data={owner_data == undefined ? { full_name: "Administrator" } : owner_data} usersList={usersList} />
    )
}

interface ApproveAmendPOPageProps {
    so_data: ProcurementOrdersType | undefined
    project_data: ProjectsType | undefined
    owner_data: NirmaanUsersType | undefined | { full_name: String }
    versionsData: NirmaanVersionsType | undefined
    usersList: any
}


const ApproveAmendSOPage = ({ so_data, project_data, owner_data, versionsData, usersList }: ApproveAmendPOPageProps) => {

    const navigate = useNavigate()
    const userData = useUserData()

    const getUserName = (name) => {
        if (usersList) {
            return usersList?.find((user) => user?.name === name)?.full_name
        }
    }

    const { data: amendmentComment } = useFrappeGetDocList("Nirmaan Comments", {
        fields: ["*"],
        filters: [["reference_name", "=", so_data?.name], ["subject", "=", "sr amendment"]]
    })

    const {data : vendorsList} = useFrappeGetDocList("Vendors", {
        fields: ["*"],
        filters: [["vendor_type", "in", ["Service", "Material & Service"]]],
        limit: 10000
    })

    // console.log("amendmentComment", amendmentComment)

    const [previousVendor, setPreviousVendor] = useState("")
    const [amendedVendor, setAmendedVendor] = useState("")
    const [previousOrderList, setPreviousOrderList] = useState<any[]>([])
    const [amendedOrderList, setAmendedOrderList] = useState<any[]>([])
    const [newlyAddedItems, setNewlyAddedItems] = useState<any[]>([])
    const [comment, setComment] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'revert'>('approve');
    const [previousCategoryList, setPreviousCategoryList] = useState<any[]>([])

    useEffect(() => {
        if (versionsData) {
            const orderChange = versionsData[0];

            if (orderChange) {
                // Parse the 'data' field from the orderChange object
                const parsedData = JSON.parse(orderChange.data);
                const { changed } = parsedData;

                // Find the change related to 'order_list'
                const orderListChange = changed.find((item) => item[0] === 'service_order_list');

                const vendorChange = changed.find(i => i[0] === "vendor")

                const categoryChange = changed.find(i => i[0] === "service_category_list")

                if(categoryChange) {
                    setPreviousCategoryList(categoryChange?.[1]?.list || [])
                }

                if(vendorChange) {
                    setPreviousVendor(vendorChange?.[1])
                    setAmendedVendor(vendorChange?.[2])
                }

                if (orderListChange) {
                    // Access the original and amended lists
                    const originalOrderList = orderListChange?.[1]?.list || [];
                    const amendedOrderList = orderListChange?.[2]?.list || [];

                    const newlyAddedItems = amendedOrderList.filter(
                        (amendedItem) => !originalOrderList.some((item) => item.id === amendedItem.id)
                    );

                    // Set the state for previous and amended lists
                    setPreviousOrderList(originalOrderList);
                    setAmendedOrderList(amendedOrderList);
                    setNewlyAddedItems(newlyAddedItems);
                }
            }
        }
    }, [versionsData]);

    // console.log("comment", comment)

    console.log("so_data", so_data)

    const { updateDoc, loading: update_loading } = useFrappeUpdateDoc()
    const { createDoc, loading: create_loading } = useFrappeCreateDoc()

    const {deleteDoc, loading: delete_loading} = useFrappeDeleteDoc()

    const { toast } = useToast();

    const handleAction = async () => {
        try {
            if (actionType === 'approve') {
                await updateDoc("Service Requests", so_data.name, {
                    status: "Approved",
                })
                if (comment.length) {
                    await createDoc("Nirmaan Comments", {
                        comment_type: "Comment",
                        reference_doctype: "Service Requests",
                        reference_name: so_data.name,
                        comment_by: userData?.user_id,
                        content: comment,
                        subject: "approving so(amendment)"
                    })
                }
            } else {
                await updateDoc("Service Requests", so_data.name, {
                    status: "Approved",
                    service_category_list: previousCategoryList?.length ? {list : previousCategoryList} : JSON.parse(so_data?.service_category_list),
                    service_order_list: { list: previousOrderList },
                    vendor: previousVendor ? previousVendor : so_data.vendor
                })
                if (comment.length) {
                    await createDoc("Nirmaan Comments", {
                        comment_type: "Comment",
                        reference_doctype: "Service Requests",
                        reference_name: so_data.name,
                        comment_by: userData?.user_id,
                        content: comment,
                        subject: "reverting so(amendment)"
                    })
                }
            }

            await deleteDoc("Nirmaan Versions", versionsData[0].name)

            toast({
                title: "Success",
                description: `SO has been successfully ${actionType === 'approve' ? 'approved' : 'reverted'}`,
                variant: "success"
            });
            setIsDialogOpen(false);
            navigate("/approve-amended-so")
        } catch (error) {
            console.log("error in ApproveAmmendedSOPage", error)
            toast({
                title: "Error",
                description: "An error occurred. Please try again.",
                variant: "destructive"
            });
        }
    };

    const renderCell = (label: string, value: string | number, isChanged: boolean, type: string) => (
        <div className={`py-1 ${isChanged ? (type === "previous" ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-green-100 dark:bg-green-900') : ''}`}>
            <span className="font-medium">{label}:</span> {value}
        </div>
    )

    const getVendorName = (vendorId) => {
        return vendorsList?.find(ven => ven.name === vendorId)?.vendor_name;
    }

    return (
        <div className="flex-1 space-y-4">
            {/* PO Details Card */}
            <div className="flex items-center">
                {/* <ArrowLeft className='cursor-pointer' onClick={() => navigate("/approve-amended-po")} /> */}
                <h2 className="text-base pl-2 font-bold tracking-tight text-pageheader">Approve/Revert Amendments</h2>
            </div>
            {/* <Card className="flex flex-wrap lg:grid lg:grid-cols-4 gap-4 border border-gray-100 rounded-lg p-4">
                <div className="border-0 flex flex-col justify-center max-sm:hidden">
                    <p className="text-left py-1 font-light text-sm text-sm text-red-700">Date:</p>
                    <p className="text-left font-bold py-1 font-bold text-base text-black">{formatDate(po_data?.modified)}</p>
                </div>
                <div className="border-0 flex flex-col justify-center">
                    <p className="text-left py-1 font-light text-sm text-sm text-red-700">Project</p>
                    <p className="text-left font-bold py-1 font-bold text-base text-black">{project_data?.project_name}</p>
                </div>
                <div className="border-0 flex flex-col justify-center max-sm:hidden">
                    <p className="text-left py-1 font-light text-sm text-sm text-red-700">Vendor</p>
                    <p className="text-left font-bold py-1 font-bold text-base text-black">{po_data?.vendor_name}</p>
                </div>
                <div className="border-0 flex flex-col justify-center max-sm:hidden">
                    <p className="text-left py-1 font-light text-sm text-sm text-red-700">Amended By</p>
                    <p className="text-left font-bold py-1 font-bold text-base text-black">{po_data?.modified_by === "Administrator" ? "Administrator" : getUserName(po_data?.modified_by)}</p>
                </div>
            </Card> */}
            <ProcurementActionsHeaderCard orderData={so_data} sr={true} />

            {/* Item Comparison Table */}
            <Card className="mt-4 p-4 shadow-lg overflow-hidden">
                {previousVendor && (
                    <div className="flex flex-col gap-2 p-2 bg-gray-100 rounded-lg mb-2">
                        <div className="flex items-center font-semibold">
                            <h2 className="w-[20%]">Vendor Change</h2>
                            <h2 className="w-[40%]">Original</h2>
                            <h2 className="w-[40%]">Amended</h2>
                        </div>
                        <div className="flex items-center text-sm">
                            <h2 className="w-[20%]">Vendor</h2>
                            <h2 className="w-[40%]">{getVendorName(previousVendor)}</h2>
                            <h2 className="w-[40%]">{getVendorName(amendedVendor)}</h2>
                        </div>
                    </div>
                )}
                <Table>
                    <TableHeader className="bg-red-100 sticky top-0">
                        <TableRow>
                            <TableHead className="w-[20%]">Service Category</TableHead>
                            <TableHead className="w-[40%]">Original</TableHead>
                            <TableHead className="w-[40%]">Amended</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {previousOrderList?.map((item, index) => {
                            const amendedItem = amendedOrderList?.find(i => i.id === item.id);
                            return (
                                <TableRow key={index}>
                                    {/* Item Name */}
                                    <TableCell className="font-bold">{item.category}</TableCell>
                                    {/* Original Details */}
                                    <TableCell className={`${!amendedItem ? "bg-yellow-100 dark:bg-yellow-900" : ""}`}>
                                        <div className="space-y-1 text-sm">
                                            {renderCell("Description", item.description, !amendedItem ? false : item.description !== amendedItem?.description, "previous")}
                                            {renderCell("Unit", item.uom, !amendedItem ? false : item.uom !== amendedItem?.uom, "previous")}
                                            {renderCell("Quantity", item.quantity, !amendedItem ? false : item.quantity !== amendedItem?.quantity, "previous")}
                                            {renderCell("Quote", item.rate, !amendedItem ? false : item.rate !== amendedItem?.rate, "previous")}
                                        </div>
                                    </TableCell>

                                    {/* Amended Details */}
                                    <TableCell>
                                        <div className="space-y-1 text-sm">
                                            {amendedItem ? (
                                                <>
                                                    {renderCell("Description", amendedItem.description, item.description !== amendedItem.description)}
                                                    {renderCell("Unit", amendedItem.uom, item.uom !== amendedItem.uom)}
                                                    {renderCell("Quantity", amendedItem.quantity, item.quantity !== amendedItem.quantity)}
                                                    {renderCell("Quote", amendedItem.rate, item.rate !== amendedItem.rate)}
                                                </>
                                            ) : (
                                                <p className="text-red-500">Deleted</p>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {/* Iterate over newlyAddedItems to show added items */}
                        {newlyAddedItems?.map((item, index) => (
                            <TableRow key={`new-${index}`}>
                                {/* Item Name */}
                                <TableCell className="font-bold">{item.category}</TableCell>
                        
                                {/* Empty Original Details for new items */}
                                <TableCell>
                                    <div className="text-gray-500 italic">Newly Added</div>
                                </TableCell>
                        
                                {/* Amended Details */}
                                <TableCell className="bg-green-100 dark:bg-green-900">
                                    <div className="space-y-1 text-sm">
                                        {renderCell("Description", item.description, false)}
                                        {renderCell("Unit", item.uom, false)}
                                        {renderCell("Quantity", item.quantity, false)}
                                        {renderCell("Quote", item.rate, false)}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

            </Card>

            <div className="py-4">
                <div className="flex items-center space-y-2">
                    <h2 className="text-base pt-1 pl-2 font-bold tracking-tight">Amendment Comments</h2>
                </div>

                {amendmentComment && amendmentComment?.length !== 0 ? (
                    amendmentComment.map((cmt) => (
                        <div key={cmt.name} className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg mb-2">
                            <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${cmt.comment_by}`} />
                                <AvatarFallback>{cmt.comment_by[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium text-sm text-gray-900">{cmt.content}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm text-gray-500">
                                        {cmt.comment_by === "Administrator" ? "Administrator" : getUserName(cmt.comment_by)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {formatDate(cmt.creation.split(" ")[0])} {cmt.creation.split(" ")[1].substring(0, 5)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <span className="text-xs font-semibold flex items-center justify-center">No Comments Found.</span>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 my-4">
                <Button
                    variant="outline"
                    onClick={() => {
                        setActionType('revert');
                        setIsDialogOpen(true);
                    }}
                    className="flex items-center space-x-2"
                >
                    <Undo2 className="mr-2" /> Revert to Original
                </Button>
                <Button
                    onClick={() => {
                        setActionType('approve');
                        setIsDialogOpen(true);
                    }}
                    className="flex items-center space-x-2"
                >
                    <CheckCheck className="mr-2" /> Approve Amendments
                </Button>
            </div>

            {/* Comment Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionType === 'approve' ? 'Approve Amendments' : 'Revert to Original'}</DialogTitle>
                        <DialogDescription>Add a comment for this action.</DialogDescription>
                    </DialogHeader>
                    <TextArea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add a comment (optional)"
                    />
                    {(update_loading || create_loading || delete_loading) ? <div className='flex items-center justify-center'><TailSpin width={80} color='red' /> </div> : (
                        <div className="flex justify-end mt-4">
                            <Button variant="outline" className="flex gap-1 items-center" onClick={() => setIsDialogOpen(false)}>
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>

                            <Button onClick={handleAction} className="ml-2 flex gap-1 items-center">
                                {actionType === 'approve' ? (<div className="flex gap-1 items-center"><CheckCheck className="h-4 w-4" /> Approve</div>) : (<div className="flex gap-1 items-center"><Undo2 className="h-4 w-4" /> Revert</div>)}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};


export const Component = ApproveAmendSO;