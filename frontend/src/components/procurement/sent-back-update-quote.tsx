import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { ArrowBigRightDash, ArrowLeft, CirclePlus, Download, Handshake, ListChecks, PencilLine } from 'lucide-react';
import SentBackQuotationForm from "./sent-back-quotation-form"
import { useFrappeCreateDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { NewVendor } from "@/pages/vendors/new-vendor";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { Projects as ProjectsType } from "@/types/NirmaanStack/Projects";
import { formatDate } from '@/utils/FormatDate';
import { Badge } from "../ui/badge";
import { AddVendorCategories } from "../forms/addvendorcategories";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { DataTable } from "../data-table/data-table";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { useToast } from "../ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { PrintRFQ } from "./rfq-pdf";

export const SentBackUpdateQuote = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate();

    const { data: category_data, isLoading: category_loading, error: category_error } = useFrappeGetDocList("Category", {
        fields: ["*"],
        limit: 1000
    })

    const { data: vendor_list, isLoading: vendor_list_loading, error: vendor_list_error, mutate: vendor_list_mutate } = useFrappeGetDocList("Vendors",
        {
            fields: ["*"],
            limit: 1000
        },
        "Vendors"
    );
    const { data: quotation_request_list, isLoading: quotation_request_list_loading, error: quotation_request_list_error, mutate: quotation_request_list_mutate } = useFrappeGetDocList("Quotation Requests",
        {
            fields: ["*"],
            limit: 10000
        },
        "Quotation Requests"
    );

    const { data: sent_back_list, isLoading: sent_back_list_loading, error: sent_back_list_error } = useFrappeGetDocList("Sent Back Category",
        {
            fields: ['*'],
            filters: [["workflow_state", "=", "Pending"]],
            limit: 1000
        });

    const { data: universalComments } = useFrappeGetDocList("Nirmaan Comments", {
        fields: ["*"],
        filters: [["reference_name", "=", id]],
        orderBy: { field: "creation", order: "desc" }
    })

    const { data: usersList } = useFrappeGetDocList("Nirmaan Users", {
        fields: ["*"],
        limit: 1000,
    })

    // console.log("universalComments", universalComments)

    const getFullName = (id) => {
        return usersList?.find((user) => user.name == id)?.full_name
    }

    const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]); // State for dynamic category options

    const getVendorName = (vendorName: string) => {
        return vendor_list?.find(vendor => vendor.name === vendorName)?.vendor_name;
    }

    const [page, setPage] = useState<string>('summary')
    const [uniqueVendors, setUniqueVendors] = useState({
        list: []
    })
    const [orderData, setOrderData] = useState({
        project: ''
    })

    const { createDoc } = useFrappeCreateDoc()

    useEffect(() => {
        sent_back_list?.map(item => {
            if (item.name === id) {
                setOrderData(item)
            }
        })
    }, [sent_back_list]);

    useEffect(() => {
        if (category_data) {
            const currOptions = category_data.map((item) => ({
                value: item.name,
                label: item.name + "(" + item.work_package.slice(0, 4).toUpperCase() + ")"
            }))
            setCategoryOptions(currOptions);
        }
    }, [category_data]);

    // console.log("uniqueVendors", uniqueVendors)

    // console.log("orderData", orderData)

    useEffect(() => {
        if (orderData.project) {
            const vendors = uniqueVendors.list;
            // vendor_list?.map((item) => (item.vendor_category.categories)[0] === (orderData.category_list.list)[0].name && vendors.push(item.name))
            quotation_request_list?.map((item) => {
                const isPresent = orderData.category_list.list.find(cat => cat.name === item.category)
                const isSameItem = orderData.item_list.list.find(i => i.name === item.item)
                if (orderData.procurement_request === item.procurement_task && isPresent && isSameItem) {
                    const value = item.vendor;
                    vendors.push(value)
                }
            })
            const removeDuplicates = (array) => {
                return Array.from(new Set(array));
            };
            const uniqueList = removeDuplicates(vendors);
            setUniqueVendors({
                list: uniqueList
            });
        }
    }, [quotation_request_list, orderData, vendor_list]);

    // console.log("orderData", orderData)

    // console.log("uniquevendors", uniqueVendors)

    const handleUpdateQuote = () => {
        navigate(`/sent-back-request/select-vendor/${id}`);
    }

    const isButtonDisabled = useCallback((vencat) => {
        const orderCategories = orderData?.category_list?.list || []
        return !orderCategories.every((category) => vencat.includes(category.name))
    }, [orderData, vendor_list])

    const { toast } = useToast()

    const handleAddVendor = async (vendor_name) => {

        const vendorId = vendor_list?.find((ven) => ven.vendor_name === vendor_name).name
        try {
            const promises = [];
            orderData?.item_list?.list.forEach((item) => {
                const newItem = {
                    procurement_task: orderData.procurement_request,
                    category: item.category,
                    item: item.name,
                    vendor: vendorId,
                    quantity: item.quantity
                };
                promises.push(createDoc("Quotation Requests", newItem));
            });

            await Promise.all(promises);

            // Mutate the vendor-related data
            // await mutate("Vendors");
            // await mutate("Quotation Requests");
            // await mutate("Vendor Category");
            vendor_list_mutate()
            quotation_request_list_mutate()

            toast({
                title: "Success!",
                description: `Vendor: ${vendor_name} Added Successfully!`,
                variant: "success"
            });
        } catch (error) {
            toast({
                title: "Failed!",
                description: `${error?.message}`,
                variant: "destructive"
            });
            console.error("There was an error while adding the vendor in sent-back-update-quote", error);
        }
    }


    // console.log("orderData", orderData)
    const columns: ColumnDef<ProjectsType>[] = useMemo(
        () => [
            {
                accessorKey: "vendor_name",
                header: ({ column }) => {
                    return (
                        <DataTableColumnHeader column={column} title="Vendor Name" />
                    )
                },
                cell: ({ row }) => {
                    const vendor_name = row.getValue("vendor_name")
                    const vendorCategories = row.getValue("vendor_category")?.categories || [];
                    return (
                        <>
                            {!isButtonDisabled(vendorCategories) && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant={"outline"} className="font-light max-md:text-xs border-green-500 py-6 flex flex-col items-start">
                                            <div className="w-[300px] text-wrap flex flex-col">
                                                <span className="text-red-500 font-semibold">{vendor_name}</span>
                                                <span>Add to Sent Back</span>
                                            </div>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Add Vendor to the current Sent Back</AlertDialogTitle>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleAddVendor(vendor_name)}>Add</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogHeader>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {isButtonDisabled(vendorCategories) && (
                                <HoverCard>
                                    <HoverCardTrigger>
                                        <Button disabled={isButtonDisabled(vendorCategories)} variant={"outline"} className="font-light max-md:text-xs border-green-500 py-6 flex flex-col items-start">
                                            <div className="w-[300px] text-wrap flex flex-col">
                                                <span className="text-red-500 font-semibold">{row.getValue("vendor_name")}</span> <span>Add to Sent Back</span>
                                            </div>
                                        </Button>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80 bg-gray-800 text-white p-2 rounded-md shadow-lg">
                                        <div>Please add <span className="font-semibold underline">All Associated Categories of Current Sent Back</span> to this vendor to enable</div>
                                    </HoverCardContent>
                                </HoverCard>
                            )}
                        </>
                    )
                }
            },

            {
                accessorKey: "creation",
                header: ({ column }) => {
                    return (
                        <DataTableColumnHeader column={column} title="Date Created" />
                    )
                },
                cell: ({ row }) => {
                    return (
                        <div className="font-medium">
                            {formatDate(row.getValue("creation")?.split(" ")[0])}
                        </div>
                    )
                }
            },
            {
                accessorKey: "vendor_category",
                header: ({ column }) => {
                    return (
                        <DataTableColumnHeader column={column} title="Vendor Categories" />
                    )
                },
                cell: ({ row }) => {

                    const categories = row.getValue("vendor_category")
                    const vendor_name = row.getValue("vendor_name")
                    return (
                        <div className="space-x-1 space-y-1">
                            {categories?.categories.map((cat) => (
                                <Badge key={cat} >{cat}</Badge>
                            ))}
                            <Sheet>
                                <SheetTrigger>
                                    <button className="px-2 border flex gap-1 items-center rounded-md hover:bg-gray-200">
                                        <CirclePlus className="w-3 h-3" />
                                        <span>Add categories</span>
                                    </button>
                                </SheetTrigger>
                                <SheetContent className="overflow-auto">
                                    <AddVendorCategories vendor_name={vendor_name} isSheet={true} isSentBack={true} />
                                </SheetContent>
                            </Sheet>
                        </div>
                    )
                },
                // Implement filtering for the categories
                filterFn: (row, _columnId, filterValue: string[]) => {
                    const categories = row.getValue<string[]>("vendor_category")['categories'] || [];
                    return filterValue.every((filter) => categories.includes(filter));
                },
            },
        ],
        [orderData, isButtonDisabled, vendor_list]
    )

    console.log("universalComments", universalComments)

    // console.log("orderData", orderData)

    const filteredVendorList = vendor_list?.filter((ven) => !uniqueVendors?.list?.includes(ven.name))

    return (
        <>
            {page == 'summary' &&
                    <div className="flex-1 space-y-2 md:space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center pt-1 pb-4">
                                <ArrowLeft className="cursor-pointer" onClick={() => navigate('/sent-back-request')} />
                                <h2 className="text-base pl-2 font-bold tracking-tight"><span className="text-red-700">SB-{orderData?.name?.slice(-4)}</span>: Summary</h2>
                            </div>
                            <Badge variant={orderData?.type === "Rejected" ? "destructive" : orderData?.type === "Delayed" ? "orange" : "gray"}>{orderData?.type}</Badge>
                        </div>
                        <Card className="flex flex-wrap md:grid md:grid-cols-4 gap-4 border border-gray-100 rounded-lg p-4">
                            <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">PR ID:</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.procurement_request?.slice(-4)}</p>
                            </div>
                            <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">Date:</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{formatDate(orderData?.creation?.split(" ")[0])}</p>
                            </div>
                            <div className="border-0 flex flex-col justify-center">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">Project:</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.project}</p>
                            </div>
                            <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">{orderData?.type} by</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black break-words">{orderData?.owner}</p>
                            </div>
                            {/* <div className="border-0 flex flex-col justify-center">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">Package</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.procurement_request}</p>
                            </div> */}
                            {/* <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">PR Number</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.name?.slice(-4)}</p>
                            </div> */}
                        </Card>
                        <div className="pt-5 text-red-700 font-light text-base underline">{orderData?.type} Items</div>
                        <div className="overflow-x-auto">
                            <Table className="min-w-full divide-gray-200">
                                <TableHeader className="bg-red-100">
                                    <TableRow>
                                        <TableHead className="w-[60%]">Items</TableHead>
                                        <TableHead className="w-[10%]">UOM</TableHead>
                                        <TableHead className="w-[10%]">Quantity</TableHead>
                                        {/* <TableHead className="w-[10%]">Rate</TableHead>
                                        <TableHead className="w-[10%]">Amount</TableHead> */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white divide-y divide-gray-200">
                                    {orderData.item_list?.list.map(item => (
                                        <TableRow key={item.name}>
                                            <TableCell>{item.item}</TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            {/* <TableCell>{item.quote}</TableCell>
                                            <TableCell>{item.quote * item.quantity}</TableCell> */}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center space-y-2 pt-8">
                            <h2 className="text-base pt-1 pl-2 font-bold tracking-tight">Sent Back Comments</h2>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                            {/* {universalComments && (universalComments[0]?.content ? universalComments[0].content : "No Comments")} */}
                        {
                            universalComments?.length ? (
                                <div className="flex flex-col px-3 py-1 shadow-sm rounded-lg">
                                        <p className="font-semibold text-[15px] mb-1">{universalComments[0]?.content}</p>
                                        {/* {universalComments[0]?.comment_by === "Administrator" ? (
                                            <span className="text-sm italic">-Administrator</span>
                                        ) : (
                                            <span className="text-sm italic">- {getFullName(universalComments[0]?.comment_by)}</span>
                                        )} */}

                            <div className="flex justify-between items-center text-sm text-gray-600 italic">
                                {universalComments[0]?.comment_by === "Administrator" ? (
                                  <span>- Administrator</span>
                                ) : (
                                  <span>- {getFullName(universalComments[0]?.comment_by)}</span>
                                )}

                                <span className="text-xs text-gray-500">
                                  {formatDate(universalComments[0]?.creation.split(" ")[0])} {universalComments[0]?.creation.split(" ")[1].substring(0, 5)}
                                </span>
                              </div>
                            </div>
                            ) : (
                                <span className="font-semibold text-xs">No Comments Found</span>
                            )
                        }
                        </div>
                        <div className="flex flex-col justify-end items-end">
                            <Button onClick={() => setPage('quotation')} className="flex items-center gap-1">
                                Next
                                <ArrowBigRightDash className="max-md:w-4 max-md:h-4" />
                            </Button>
                        </div>
                    </div>}
            {
                page == 'quotation' &&
                    <div className="flex-1 md:space-y-4">
                        <div className="flex items-center pt-1  pb-4">
                            <ArrowLeft className="cursor-pointer" onClick={() => setPage('summary')} />
                            <h2 className="text-base pl-2 font-bold tracking-tight"><span className="text-red-700">SB-{orderData?.name?.slice(-4)}</span>: Update Quote</h2>
                        </div>
                        <Card className="flex md:grid md:grid-cols-4 gap-4 border border-gray-100 rounded-lg p-4">
                            <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">PR ID:</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.procurement_request?.slice(-4)}</p>
                            </div>
                            <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">Date:</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{formatDate(orderData?.creation?.split(" ")[0])}</p>
                            </div>
                            <div className="border-0 flex flex-col justify-center">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">Project:</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.project}</p>
                            </div>
                            <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">{orderData?.type} by</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.owner}</p>
                            </div>
                            {/* <div className="border-0 flex flex-col justify-center">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">Package</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.procurement_request}</p>
                            </div> */}
                            {/* <div className="border-0 flex flex-col justify-center max-sm:hidden">
                                <p className="text-left py-1 font-light text-sm text-sm text-red-700">PR Number</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.name?.slice(-4)}</p>
                            </div> */}
                        </Card>
                        <div className="flex justify-between">
                            <div className="p-2 sm:pl-7 font-light underline text-red-700">Selected Vendor List</div>
                            <div className="p-2 sm:pl-7 font-light underline text-red-700 pr-10 sm:pr-32">Options</div>
                        </div>
                        {uniqueVendors.list.map((item) => {
                            return <div className="sm:px-4 max-sm:py-2 flex justify-between items-center max-sm:border-b">
                                <div className="sm:pl-4 pl-2 py-4 font-semibold">{getVendorName(item)}</div>
                                <div className="flex space-x-2 max-sm:flex-col items-center justify-center max-sm:gap-2">
                                    <Sheet>
                                        <SheetTrigger className="border-2 border-opacity-50 border-red-500 text-red-500 bg-white font-normal px-4 my-2 rounded-lg"><div className="flex"><Download className="h-5 w-5 mt-0.5 mr-1" />RFQ PDF</div></SheetTrigger>
                                        <SheetContent className="overflow-auto">
                                            {/* <ScrollArea className="h-[90%] w-[600px] rounded-md border p-4"> */}
                                            <SheetHeader>
                                                <SheetTitle className="text-center">Print PDF</SheetTitle>
                                                <SheetDescription>
                                                    <PrintRFQ vendor_id={item} pr_id={orderData?.procurement_request} itemList={orderData?.item_list || []} />
                                                </SheetDescription>
                                            </SheetHeader>
                                            {/* </ScrollArea> */}
                                        </SheetContent>
                                    </Sheet>
                                    <Sheet>
                                        <SheetTrigger className="border-2 border-opacity-50 border-red-500 text-red-500 bg-white font-normal px-4 my-2 rounded-lg">Enter Price(s)</SheetTrigger>
                                        <SheetContent className="overflow-auto">
                                            {/* <ScrollArea className="h-[90%] w-[600px] rounded-md border p-4"> */}
                                            <SheetHeader className="text-start">
                                                    <div className="flex items-center gap-1">
                                                        <SheetTitle className="text-xl">Enter Price(s)</SheetTitle>
                                                        <PencilLine className="w-5 h-5 text-primary" />
                                                    </div>
                                                <SheetDescription className="py-2">
                                                {/* <Card className="p-5"> */}
                                                    <SentBackQuotationForm vendor_id={item} pr_id={orderData.procurement_request} sb_id={id} />
                                                {/* </Card> */}
                                                </SheetDescription>
                                            </SheetHeader>
                                            {/* </ScrollArea> */}
                                        </SheetContent>
                                    </Sheet>
                                </div>
                            </div>
                        })}
                        <div className="flex items-center justify-between mt-6">
                        <Sheet>
                            <SheetTrigger className="text-blue-500"><div className="flex items-center gap-1 ml-4"><CirclePlus className="w-4 h-4" />Add New Vendor</div></SheetTrigger>
                            <SheetContent className="overflow-auto">
                                <SheetHeader className="text-start">
                                    <SheetTitle>Add New Vendor for "{orderData.name}"</SheetTitle>
                                    <SheetDescription>
                                        <div className="flex-1">
                                            <span className=" text-slim text-sm text-red-700">Note:</span>
                                            <p className="text-xs"> - This will add a new vendor entry within the system. Only add new vendors here.</p>
                                            <p className="text-xs"> - This form will automatically add vendors categories from this PR/SB to the vendor.</p>
                                        </div>
                                        {/* <SentBackVendorForm quotation_request_list_mutate={quotation_request_list_mutate} sent_back_data={orderData} vendor_list_mutate={vendor_list_mutate} /> */}
                                        <NewVendor dynamicCategories={orderData?.category_list?.list?.map(item => item.name) || []} sentBackData={orderData} renderCategorySelection={false} navigation={false} />
                                    </SheetDescription>
                                </SheetHeader>
                            </SheetContent>
                        </Sheet>
                            <Button className="flex items-center gap-1" onClick={handleUpdateQuote}>
                                <ListChecks className="h-4 w-4" />
                                Update Quote
                            </Button>
                        </div>
                        <Accordion type="multiple" >
                            <AccordionItem value="Vendors">
                                <AccordionTrigger>
                                    <Button variant="ghost" size="lg" className="md:mb-2 text-base md:text-lg px-2  w-full justify-start">
                                        <span className=" text-base mb-0.5 md:text-lg font-slim">Add Existing Vendors</span>
                                    </Button>
                                </AccordionTrigger>
                                <AccordionContent>
                                        <Card className="max-md:p-0">
                                            <CardHeader className="max-md:p-0">
                                            <div className="pl-6 flex gap-1 items-center pt-10 max-md:pt-6 flex-wrap">
                                                <span className="font-light max-md:text-sm">Sent Back Categories: </span>
                                                {orderData?.category_list?.list.map((cat) => (
                                                    <Badge>{cat.name}</Badge>
                                                ))}
                                            </div>
                                                <CardContent>
                                                    <DataTable columns={columns} data={filteredVendorList || []} category_options={categoryOptions} />
                                                </CardContent>
                                            </CardHeader>
                                        </Card>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
            }
        </>
    )
}