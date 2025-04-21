import {FrappeDB} from "frappe-js-sdk/lib/db";
import { Socket } from 'socket.io-client'; // Ensure correct import if FrappeSocket is not the base type
import {
    handlePOAmendedEvent,
    handlePONewEvent,
    handlePRApproveNewEvent,
    handlePRDeleteEvent,
    handlePRNewEvent,
    handlePRVendorSelectedEvent,
    handleSBNewEvent,
    handleSBVendorSelectedEvent,
    handleSOAmendedEvent,
    handleSRApprovedEvent,
    handleSRVendorSelectedEvent
} from "@/zustand/eventListeners"; // Assuming these are correctly defined elsewhere
import { NotificationType, useNotificationStore } from "@/zustand/useNotificationStore";
import { useDataRefetchStore } from "@/zustand/useDataRefetchStore";

// --- Define Explicit Action Interfaces ---
// These interfaces describe the shape of the action objects we expect.

export interface NotificationServiceActions {
    add_new_notification: (notification: NotificationType) => void;
    delete_notification: (notificationId: string) => void;
    // Add other needed actions like add_all_notific_directly if used within listeners
}

export interface DataRefetchServiceActions {
    triggerPrRefetch: () => void;
    triggerSbRefetch: () => void;
    triggerPoRefetch: () => void;
    triggerSrRefetch: () => void;
    triggerPaymentRefetch: () => void;
    triggerNotificationRefetch: () => void;
}

// Define types for the store actions explicitly if needed
// type NotificationStoreActions = Pick<
//     ReturnType<typeof useNotificationStore>,
//     'add_new_notification' | 'delete_notification' | 'add_all_notific_directly' | 'clear_notifications'
// >;

// type DataRefetchStoreActions = Pick<
//     ReturnType<typeof useDataRefetchStore>,
//     | 'triggerPrRefetch'
//     | 'triggerSbRefetch'
//     | 'triggerPoRefetch'
//     | 'triggerSrRefetch'
//     | 'triggerPaymentRefetch'
//     | 'triggerNotificationRefetch'
// >;

interface InitializeListenersArgs {
    socket: Socket; // Use the correct Socket type from your context/sdk
    db: FrappeDB;
    notificationActions: NotificationServiceActions;
    refetchActions: DataRefetchServiceActions;
    // Add role/userId if needed by handler functions, though ideally handlers get this info from the event payload or make specific queries
}

/**
 * Initializes global Socket.IO event listeners for the application.
 * Returns a cleanup function to remove listeners.
 */
export const initializeSocketListeners = ({
    socket,
    db,
    notificationActions,
    refetchActions,
}: InitializeListenersArgs): (() => void) => {

    console.log("Initializing global socket listeners...");

    // --- Event Handlers ---

    // Helper to wrap async handlers with error catching
    const safeHandler = (handler: (...args: any[]) => Promise<void>) => {
        return async (...args: any[]) => {
            try {
                await handler(...args);
                console.log(`Socket event handler ${handler.name} executed successfully.`);
            } catch (error) {
                console.error(`Error in socket event handler (${handler.name || 'anonymous'}):`, error);
            }
        };
    };

    // --- Basic Connection Logging (Good for Debugging) ---
     const handleConnect = () => {
        console.log("Socket connected (Global Listener):", socket.id);
    };
    const handleDisconnect = (reason: Socket.DisconnectReason) => {
        console.log("Socket disconnected (Global Listener):", reason);
    };
    const handleConnectError = (err: Error) => {
         console.error("Socket connection error (Global Listener):", err);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // --- Custom Application Event Listeners ---

    // PR Events
    const onPrNew = safeHandler(async (event: any) => handlePRNewEvent(db, event, notificationActions.add_new_notification));
    const onPrDelete = (event: any) => handlePRDeleteEvent(event, notificationActions.delete_notification);
    const onPrVendorSelected = safeHandler(async (event: any) => handlePRVendorSelectedEvent(db, event, notificationActions.add_new_notification));
    const onPrApproved = safeHandler(async (event: any) => handlePRApproveNewEvent(db, event, notificationActions.add_new_notification));
    const onPrRejected = safeHandler(async (event: any) => handlePRNewEvent(db, event, notificationActions.add_new_notification)); // Assuming same handler for rejected

    socket.on("pr:new", onPrNew);
    socket.on("pr:delete", onPrDelete);
    socket.on("pr:vendorSelected", onPrVendorSelected);
    socket.on("pr:approved", onPrApproved);
    socket.on("pr:rejected", onPrRejected);

    // SB Events
    const onSbVendorSelected = safeHandler(async (event: any) => handleSBVendorSelectedEvent(db, event, notificationActions.add_new_notification));
    const onSbNew = safeHandler(async (event: any) => handleSBNewEvent(db, event, notificationActions.add_new_notification));

    socket.on("sb:vendorSelected", onSbVendorSelected);
    socket.on("Rejected-sb:new", onSbNew);
    socket.on("Delayed-sb:new", onSbNew);
    socket.on("Cancelled-sb:new", onSbNew);

    // PO Events
    const onPoAmended = safeHandler(async (event: any) => handlePOAmendedEvent(db, event, notificationActions.add_new_notification));
    const onPoNew = safeHandler(async (event: any) => handlePONewEvent(db, event, notificationActions.add_new_notification));
    const onPoDelete = (event: any) => handlePRDeleteEvent(event, notificationActions.delete_notification); // Assuming same delete handler

    socket.on("po:amended", onPoAmended);
    socket.on("po:new", onPoNew);
    socket.on("po:delete", onPoDelete);

    // SR Events
    const onSrVendorSelected = safeHandler(async (event: any) => handleSRVendorSelectedEvent(db, event, notificationActions.add_new_notification));
    const onSrApproved = safeHandler(async (event: any) => handleSRApprovedEvent(db, event, notificationActions.add_new_notification));
    const onSrDelete = (event: any) => handlePRDeleteEvent(event, notificationActions.delete_notification); // Assuming same delete handler
    const onSrAmended = safeHandler(async (event: any) => handleSOAmendedEvent(db, event, notificationActions.add_new_notification));

    socket.on("sr:vendorSelected", onSrVendorSelected);
    socket.on("sr:approved", onSrApproved);
    socket.on("sr:delete", onSrDelete);
    socket.on("sr:amended", onSrAmended);

    // Payment Events
    const onPaymentNew = safeHandler(async (event: any) => handlePONewEvent(db, event, notificationActions.add_new_notification)); // Adapt handler if needed
    const onPaymentApproved = safeHandler(async (event: any) => handleSRApprovedEvent(db, event, notificationActions.add_new_notification)); // Adapt handler if needed
    const onPaymentFulfilled = safeHandler(async (event: any) => handlePONewEvent(db, event, notificationActions.add_new_notification)); // Adapt handler if needed
    const onPaymentDelete = (event: any) => handlePRDeleteEvent(event, notificationActions.delete_notification); // Assuming same delete handler

    socket.on("payment:new", onPaymentNew);
    socket.on("payment:approved", onPaymentApproved);
    socket.on("payment:fulfilled", onPaymentFulfilled);
    socket.on("payment:delete", onPaymentDelete);


    // --- Doctype Change Listeners (Triggering Refetches) ---
    // These listeners signal that data *might* have changed, components decide whether to refetch.

    const onDocTypeChange = (handler: () => void) => {
        return (event: any) => { // Event payload might contain useful info (docname, etc.) but we just trigger refetch here
            // console.log(`Doctype Change Detected: ${event?.doctype}`); // Optional logging
            if (typeof handler === 'function') { // Runtime check for safety
                handler();
           } else {
                console.error("Invalid handler passed to onDocTypeChange:", handler);
           }
        };
    };

    const onPrChange = onDocTypeChange(refetchActions.triggerPrRefetch);
    const onSbChange = onDocTypeChange(refetchActions.triggerSbRefetch);
    const onPoChange = onDocTypeChange(refetchActions.triggerPoRefetch);
    const onSrChange = onDocTypeChange(refetchActions.triggerSrRefetch);
    const onPaymentChange = onDocTypeChange(refetchActions.triggerPaymentRefetch);
    const onNotificationChange = onDocTypeChange(refetchActions.triggerNotificationRefetch);

    socket.on("doc_change:Procurement Requests", onPrChange);
    socket.on("doc_change:Sent Back Category", onSbChange);
    socket.on("doc_change:Procurement Orders", onPoChange);
    socket.on("doc_change:Service Requests", onSrChange);
    socket.on("doc_change:Project Payments", onPaymentChange);
    socket.on("doc_change:Nirmaan Notifications", onNotificationChange);

    // --- Cleanup Function ---
    const cleanup = () => {
        console.log("Cleaning up global socket listeners...");

        // Basic listeners
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("connect_error", handleConnectError);

        // Custom listeners
        socket.off("pr:new", onPrNew);
        socket.off("pr:delete", onPrDelete);
        socket.off("pr:vendorSelected", onPrVendorSelected);
        socket.off("pr:approved", onPrApproved);
        socket.off("pr:rejected", onPrRejected);

        socket.off("sb:vendorSelected", onSbVendorSelected);
        socket.off("Rejected-sb:new", onSbNew);
        socket.off("Delayed-sb:new", onSbNew);
        socket.off("Cancelled-sb:new", onSbNew);

        socket.off("po:amended", onPoAmended);
        socket.off("po:new", onPoNew);
        socket.off("po:delete", onPoDelete);

        socket.off("sr:vendorSelected", onSrVendorSelected);
        socket.off("sr:approved", onSrApproved);
        socket.off("sr:delete", onSrDelete);
        socket.off("sr:amended", onSrAmended);

        socket.off("payment:new", onPaymentNew);
        socket.off("payment:approved", onPaymentApproved);
        socket.off("payment:fulfilled", onPaymentFulfilled);
        socket.off("payment:delete", onPaymentDelete);

        // Doctype change listeners
        socket.off("doc_change:Procurement Requests", onPrChange);
        socket.off("doc_change:Sent Back Category", onSbChange);
        socket.off("doc_change:Procurement Orders", onPoChange);
        socket.off("doc_change:Service Requests", onSrChange);
        socket.off("doc_change:Project Payments", onPaymentChange);
        socket.off("doc_change:Nirmaan Notifications", onNotificationChange);
    };

    return cleanup;
};