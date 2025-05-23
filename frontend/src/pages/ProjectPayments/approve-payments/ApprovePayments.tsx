import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table"; // Keep ColumnDef
import {
    FrappeConfig,
    FrappeContext,
    useFrappeDocTypeEventListener,
    useFrappeGetDocList,
    useFrappeUpdateDoc
} from "frappe-react-sdk";
import { CircleCheck, CircleX, Info, SquarePen } from "lucide-react";

// UI Components
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button"; // Keep Button if needed elsewhere
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

// Dialog Component
import { PaymentActionDialog } from "./components/PaymentActionDialog"; // Adjust path

// Types and Constants
import { ProcurementOrder } from "@/types/NirmaanStack/ProcurementOrders";
import { ProjectPayments } from "@/types/NirmaanStack/ProjectPayments";
import { Projects } from "@/types/NirmaanStack/Projects";
import { ServiceRequests } from "@/types/NirmaanStack/ServiceRequests";
import { Vendors } from "@/types/NirmaanStack/Vendors";
import { DOC_TYPES, PAYMENT_STATUS, DIALOG_ACTION_TYPES, DialogActionType } from './constants'; // Adjust path


import { formatToRoundedIndianRupee } from "@/utils/FormatPrice";
import { getPOTotal, getSRTotal, getTotalAmountPaid } from "@/utils/getAmounts";
import { parseNumber } from "@/utils/parseNumber";

// Zustand Store
import { NotificationType, useNotificationStore } from "@/zustand/useNotificationStore";
import { formatDate } from "date-fns";
import { memoize } from "lodash";

// Helper Type for simplified value/label pairs
interface SelectOption {
    label: string;
    value: string;
}

export const ApprovePayments: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { db } = useContext(FrappeContext) as FrappeConfig; // Assume db is always available

    // --- State ---
    const [selectedPayment, setSelectedPayment] = useState<ProjectPayments | null>(null);
    const [dialogActionType, setDialogActionType] = useState<DialogActionType>(DIALOG_ACTION_TYPES.APPROVE);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    // --- Data Fetching ---
    const { data: projects, isLoading: projectsLoading, error: projectsError } = useFrappeGetDocList<Projects>(
        DOC_TYPES.PROJECTS, { fields: ["name", "project_name"], limit: 1000 }, 'Projects'
    );
    const { data: vendors, isLoading: vendorsLoading, error: vendorsError } = useFrappeGetDocList<Vendors>(
        DOC_TYPES.VENDORS, { fields: ["name", "vendor_name"], limit: 10000 }, 'Vendors'
    );
    // Fetch BOTH Requested and Paid payments (or remove filter entirely if safe)
    const { data: allProjectPayments, isLoading: projectPaymentsLoading, error: projectPaymentsError, mutate: projectPaymentsMutate } = useFrappeGetDocList<ProjectPayments>(
        DOC_TYPES.PROJECT_PAYMENTS, {
        fields: ["*"], // Still consider specifying fields: name, status, amount, document_name, document_type
        // Option A: Filter for relevant statuses
        filters: [["status", "in", [PAYMENT_STATUS.REQUESTED, PAYMENT_STATUS.PAID]]],
        // Option B: No status filter (if other statuses are few or also needed)
        // filters: [],
        limit: 100000, // Keep being mindful of this limit
        orderBy: { field: "creation", order: "desc" }
    },
        // Add a unique query key suffix if needed, though often not necessary if filters change
        // 'ProjectPayments_AllRelevant'
    );
    const { data: purchaseOrders, isLoading: poLoading, error: poError } = useFrappeGetDocList<ProcurementOrder>(
        DOC_TYPES.PROCUREMENT_ORDERS, {
        fields: ["*"], // Specify fields needed for getPOTotal and navigation logic
        filters: [["status", "not in", ["Cancelled", "Merged"]]],
        limit: 100000,
        orderBy: { field: "modified", order: "desc" },
    });
    const { data: serviceOrders, isLoading: srLoading, error: srError } = useFrappeGetDocList<ServiceRequests>(
        DOC_TYPES.SERVICE_REQUESTS, {
        fields: ["*"], // Specify fields needed for getSRTotal and navigation logic
        filters: [["status", "=", "Approved"]], // Assuming only approved SRs have payments
        limit: 10000,
        orderBy: { field: "modified", order: "desc" },
    });

    // --- Combined Loading and Error State ---
    const isLoading = projectsLoading || vendorsLoading || projectPaymentsLoading || poLoading || srLoading;
    const combinedError = projectsError || vendorsError || projectPaymentsError || poError || srError;

    // Display errors via toast (could be enhanced with a dedicated error component)
    useEffect(() => {
        if (projectsError) toast({ title: "Error loading Projects", description: projectsError.message, variant: "destructive" });
        if (vendorsError) toast({ title: "Error loading Vendors", description: vendorsError.message, variant: "destructive" });
        if (projectPaymentsError) toast({ title: "Error loading Payments", description: projectPaymentsError.message, variant: "destructive" });
        if (poError) toast({ title: "Error loading Purchase Orders", description: poError.message, variant: "destructive" });
        if (srError) toast({ title: "Error loading Service Requests", description: srError.message, variant: "destructive" });
    }, [projectsError, vendorsError, projectPaymentsError, poError, srError, toast]);


    // --- Document Event Listener ---
    useFrappeDocTypeEventListener(DOC_TYPES.PROJECT_PAYMENTS, async (d) => {
        console.log("Project Payment Event:", d); // Log for debugging
        await projectPaymentsMutate();
    });

    // --- Zustand Store Integration ---
    const { notifications, mark_seen_notification } = useNotificationStore();

    // --- Memoized Lookups ---
    const projectValues = useMemo<SelectOption[]>(() => projects?.map(p => ({ label: p.project_name, value: p.name })) || [], [projects]);
    const vendorValues = useMemo<SelectOption[]>(() => vendors?.map(v => ({ label: v.vendor_name, value: v.name })) || [], [vendors]);

    // Filtered list for the DataTable display
    const requestedPaymentsForTable = useMemo(() => {
        return allProjectPayments?.filter(p => p.status === PAYMENT_STATUS.REQUESTED) || [];
    }, [allProjectPayments]);

    // --- Calculation for "Amt Paid" ---
    // This needs to operate on the FULL list containing "Paid" entries
    const getAmountPaid = useMemo(() => memoize((documentName: string) => {
        const paymentsForDocument = allProjectPayments?.filter(
            (payment) => payment?.document_name === documentName && payment?.status === PAYMENT_STATUS.PAID
        ) || [];
        return getTotalAmountPaid(paymentsForDocument);
        // Depend on the full list
    }, (documentName: string) => documentName), [allProjectPayments]);


    // --- Callbacks ---
    const handleNewPRSeen = useCallback((notification: NotificationType | undefined) => {
        if (notification) {
            mark_seen_notification(db, notification);
        }
    }, [db, mark_seen_notification]);

    const openDialog = useCallback((payment: ProjectPayments, type: DialogActionType) => {
        setSelectedPayment(payment);
        setDialogActionType(type);
        setIsDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setIsDialogOpen(false);
        // Optional: Delay clearing selectedPayment slightly for smoother transition
        // setTimeout(() => setSelectedPayment(null), 150);
        setSelectedPayment(null);
    }, []);

    // --- Update Logic ---
    const { updateDoc, loading: updateLoading } = useFrappeUpdateDoc();

    const handlePaymentUpdate = useCallback(async (actionType: DialogActionType, amount: number) => {
        if (!selectedPayment) return;

        const newStatus = (actionType === DIALOG_ACTION_TYPES.APPROVE || actionType === DIALOG_ACTION_TYPES.EDIT)
            ? PAYMENT_STATUS.APPROVED
            : PAYMENT_STATUS.REJECTED;

        try {
            await updateDoc(DOC_TYPES.PROJECT_PAYMENTS, selectedPayment.name, {
                status: newStatus,
                amount: amount // Amount is already parsed correctly before passing here
            });

            await projectPaymentsMutate(); // Refresh list
            closeDialog(); // Close dialog on success

            const successActionText = actionType === DIALOG_ACTION_TYPES.EDIT ? "edited and approved" : actionType;
            toast({
                title: "Success!",
                description: `Payment ${successActionText} successfully!`,
                variant: "success",
            });

        } catch (error: any) {
            console.error("Failed to update payment:", error);
            toast({
                title: "Update Failed!",
                description: error.message || "Could not update the payment status.",
                variant: "destructive",
            });
            // Keep dialog open on error? Decide based on UX preference.
            // closeDialog();
        }
    }, [selectedPayment, updateDoc, projectPaymentsMutate, closeDialog, toast]);


    // --- Column Definitions (Passed through as requested) ---
    const columns = useMemo<ColumnDef<ProjectPayments>[]>(
        () => [
            {
                accessorKey: "document_name",
                header: "#PO / #SR", // Clarify header
                cell: ({ row }) => {
                    const data = row.original;
                    const paymentId = data.name;
                    const isNew = notifications.find(
                        (item) => item.docname === paymentId && item.seen === "false" && item.event_id === "payment:new"
                    ); // Check boolean false

                    // const handleNavigate = () => {
                    //     if (!data.document_name) return;
                    //     if (data.document_type === DOC_TYPES.PROCUREMENT_ORDERS) {
                    //         const po = purchaseOrders?.find(i => i.name === data.document_name);
                    //         // Simplified tab logic (example, adjust as needed)
                    //         const tabMap: { [key: string]: string } = {
                    //             "PO Approved": "Approved PO",
                    //             "Dispatched": "Dispatched PO",
                    //             "Delivered": "Delivered PO"
                    //         };
                    //         const tab = po?.status ? tabMap[po.status] || "Approved PO" : "Approved PO";
                    //         navigate(`/purchase-orders/${data.document_name.replaceAll("/", "&=")}?tab=${tab}`);
                    //     } else if (data.document_type === DOC_TYPES.SERVICE_REQUESTS) {
                    //         navigate(`/service-requests/${data.document_name}?tab=approved-sr`);
                    //     }
                    // }

                    return (
                        <div onClick={() => handleNewPRSeen(isNew)} className="font-medium relative flex items-center gap-1.5 min-w-[170px] cursor-default group">
                            {isNew && (
                                <div className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 -left-5 animate-pulse" title="New Payment Request" />
                            )}
                            <span className="max-w-[150px]">{data.document_name}</span>
                            <HoverCard>
                                <HoverCardTrigger asChild>
                                    <Link to={data.document_type === DOC_TYPES.PROCUREMENT_ORDERS ? `${data.document_name.replaceAll("/", "&=")}` : `${data.document_name.replaceAll("/", "&=")}`} >
                                        <Info
                                            className="w-4 h-4 text-blue-600 cursor-pointer flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                                        />
                                    </Link>
                                </HoverCardTrigger>
                                <HoverCardContent className="text-xs w-auto p-2">
                                    View linked {data.document_type === DOC_TYPES.PROCUREMENT_ORDERS ? "PO" : "SR"} details
                                </HoverCardContent>
                            </HoverCard>
                        </div>
                    );
                }
            },
            // {
            //     accessorKey: "creation", // or payment_date if preferred
            //     header: ({ column }) => <DataTableColumnHeader column={column} title="Date Req." />,
            //     cell: ({ row }) => {
            //         const dateValue = row.original.creation || row.original.payment_date;
            //         return <div className="font-medium min-w-[90px]">{formatDate(new Date(dateValue!), 'dd-MMM-yyyy')}</div>;
            //     },
            // },
            {
                accessorKey: "vendor",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
                cell: ({ row }) => {
                    const vendor = vendorValues.find(v => v.value === row.getValue("vendor"));
                    return <div className="font-medium truncate max-w-[150px]">{vendor?.label || row.getValue("vendor")}</div>;
                },
                filterFn: (row, id, value) => value.includes(row.getValue(id)),
            },
            {
                accessorKey: "project",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
                cell: ({ row }) => {
                    const project = projectValues.find(p => p.value === row.getValue("project"));
                    return <div className="font-medium truncate max-w-[150px]">{project?.label || row.getValue("project")}</div>;
                },
                filterFn: (row, id, value) => value.includes(row.getValue(id)),
            },
            {
                id: "po_value", // Renamed ID for clarity
                header: ({ column }) => <DataTableColumnHeader column={column} title="PO Value" />,
                cell: ({ row }) => {
                    const data = row.original;
                    let totalValue: number | null = null;

                    if (data.document_type === DOC_TYPES.SERVICE_REQUESTS) {
                        const order = serviceOrders?.find(i => i.name === data.document_name);
                        if (order) {
                            const srTotal = getSRTotal(order); // Assume getSRTotal returns number
                            totalValue = order.gst === "true" ? srTotal * 1.18 : srTotal;
                        }
                    } else if (data.document_type === DOC_TYPES.PROCUREMENT_ORDERS) {
                        const order = purchaseOrders?.find(i => i.name === data.document_name);
                        if (order) {
                            // Ensure charges are numbers before passing
                            const loading = parseNumber(order.loading_charges);
                            const freight = parseNumber(order.freight_charges);
                            totalValue = getPOTotal(order, loading, freight)?.totalAmt ?? null;
                        }
                    }

                    return <div className="font-medium min-w-[100px]">{totalValue !== null ? formatToRoundedIndianRupee(totalValue) : "N/A"}</div>;
                },
            },
            {
                id: "Amount_paid",
                header: "Amt Paid",
                cell: ({ row }) => {
                    const data = row.original;
                    // IMPORTANT: Use document_name (PO/SR ID) for the calculation
                    const amountPaid = getAmountPaid(data?.document_name);
                    // Decide what setCurrentPaymentsDialog should do. Does it show the details
                    // of the *request* (data) or the *past paid* amounts?
                    // If it's for past paid amounts, you'll need a different function/state.
                    // const handleClick = () => {
                    //     if (amountPaid > 0) {
                    //         // TODO: Implement logic to show details of PAST paid payments
                    //         // for data.document_name. This might involve fetching them again
                    //         // or filtering `allProjectPayments`.
                    //         console.log("Show paid history for:", data.document_name);
                    //         // Example: Find paid payments and open a different dialog/modal
                    //         const paidHistory = allProjectPayments?.filter(p => p.document_name === data.document_name && p.status === PAYMENT_STATUS.PAID);
                    //         // openPaidHistoryDialog(paidHistory); // A hypothetical function
                    //     }
                    // };
                    return (
                        <div
                            className={`font-medium min-w-[100px]}`}
                        >
                            {formatToRoundedIndianRupee(amountPaid || 0)} {/* Default to 0 if null/undefined */}
                        </div>
                    );
                },
            },
            {
                accessorKey: "amount",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Req. Amt" />, // Shortened
                cell: ({ row }) => {
                    const amount = parseNumber(row.getValue("amount"))
                    return <div className="font-medium min-w-[100px]">{formatToRoundedIndianRupee(amount)}</div>;
                },
            },
            {
                id: "actions", // Combined actions
                header: "Actions",
                cell: ({ row }) => {
                    const data = row.original;
                    return (
                        <div className="flex items-center gap-3 min-w-[100px]">
                            <HoverCard>
                                <HoverCardTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => openDialog(data, DIALOG_ACTION_TYPES.APPROVE)}>
                                        <CircleCheck className="h-5 w-5" />
                                    </Button>
                                </HoverCardTrigger>
                                <HoverCardContent className="text-xs w-auto p-1.5">Approve</HoverCardContent>
                            </HoverCard>
                            <HoverCard>
                                <HoverCardTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => openDialog(data, DIALOG_ACTION_TYPES.REJECT)}>
                                        <CircleX className="h-5 w-5" />
                                    </Button>
                                </HoverCardTrigger>
                                <HoverCardContent className="text-xs w-auto p-1.5">Reject</HoverCardContent>
                            </HoverCard>
                            <HoverCard>
                                <HoverCardTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => openDialog(data, DIALOG_ACTION_TYPES.EDIT)}>
                                        <SquarePen className="h-4 w-4" />
                                    </Button>
                                </HoverCardTrigger>
                                <HoverCardContent className="text-xs w-auto p-1.5">Edit & Approve</HoverCardContent>
                            </HoverCard>
                        </div>
                    );
                },
            },
            // Removed separate editOption column as it's combined into 'actions'
        ],
        // Ensure all *stable* dependencies used inside columns are listed
        [
            // Dependencies updated
            projectValues, vendorValues, notifications, purchaseOrders, serviceOrders, handleNewPRSeen, navigate, openDialog, getAmountPaid, allProjectPayments /* Add dependency */
        ]
    );


    // --- Render Logic ---
    if (isLoading) {
        return <div className="p-4"><TableSkeleton /></div>;
    }

    // Optional: Display a more specific error message if needed
    if (combinedError && !allProjectPayments) {
        return <div className="p-4 text-red-600">Failed to load essential payment data. Please try again later.</div>;
    }

    return (
        <div className="flex-1 space-y-4">
            {/* Dialog Component */}
            <PaymentActionDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen} // Let dialog handle its own close via cancel/overlay
                type={dialogActionType}
                paymentData={selectedPayment}
                vendorName={selectedPayment ? vendorValues.find(v => v.value === selectedPayment.vendor)?.label : undefined}
                onSubmit={handlePaymentUpdate}
                isLoading={updateLoading}
            />

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={requestedPaymentsForTable || []} // Provide empty array fallback
                project_values={projectValues} // Pass lookup data if needed by DataTable (e.g., for filters)
                approvedQuotesVendors={vendorValues} // Pass lookup data if needed by DataTable
            // Add other necessary props to DataTable
            />
        </div>
    );
};

export default ApprovePayments;