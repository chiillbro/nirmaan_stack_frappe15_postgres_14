// async function handleNotification(db, event, add_new_notification) {
//     if (event?.notificationId) {
//         const newNotificationData = await db.getDoc("Nirmaan Notifications", event.notificationId);
//         if (newNotificationData) {
//             add_new_notification({
//                 name: newNotificationData.name,
//                 creation: newNotificationData.creation,
//                 description: newNotificationData.description,
//                 docname: newNotificationData.docname,
//                 document: newNotificationData.document,
//                 event_id: newNotificationData.event_id,
//                 project: newNotificationData.project,
//                 recipient: newNotificationData.recipient,
//                 recipient_role: newNotificationData.recipient_role,
//                 seen: newNotificationData.seen,
//                 sender: newNotificationData?.sender,
//                 title: newNotificationData.title,
//                 type: newNotificationData.type,
//                 work_package: newNotificationData?.work_package,
//                 action_url: newNotificationData?.action_url,
//             });
//             // console.log("Updated notifications state with new data", newNotificationData);
//         }
//     }
// }

// // Event listener for "pr:new"
// export const handlePRNewEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };

// // Event listener for "pr:delete"
// export const handlePRDeleteEvent = (event, delete_notification) => {
//     if (event?.notificationId) {
//         delete_notification(event.notificationId);
//     }
// };

// // Event listener for "pr:vendorSelected"
// export const handlePRVendorSelectedEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };

// // Event listener for "pr:resolved"
// // export const handlePRResolvedEvent = async (db, event, add_new_notification) => {
// //     await handleNotification(db, event, add_new_notification);
// // };

// // Event listener for "sb:vendorSelected"
// export const handleSBVendorSelectedEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };

// export const handlePOAmendedEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification)
// }

// export const handlePRApproveNewEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };

// export const handlePONewEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };

// export const handleSBNewEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };



// export const handleSRVendorSelectedEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };

// export const handleSRApprovedEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification);
// };

// export const handleSOAmendedEvent = async (db, event, add_new_notification) => {
//     await handleNotification(db, event, add_new_notification)
// }


// src/zustand/eventListeners.ts
import { FrappeDB } from 'frappe-js-sdk/lib/db';
import { NotificationType } from './useNotificationStore'; // Import the type

// --- Type Definitions for Callbacks ---
type AddNotificationCallback = (notification: NotificationType) => void;
type DeleteNotificationCallback = (notificationId: string) => void;

// --- Helper Function ---
async function handleNotification(
    db: FrappeDB,
    event: any, // Keep 'any' or define a specific event type if known
    add_new_notification: AddNotificationCallback
) {
    if (event?.notificationId) {
        try {
            const newNotificationData = await db.getDoc("Nirmaan Notifications", event.notificationId);
            if (newNotificationData) {
                // Map to NotificationType structure if necessary
                 const notification: NotificationType = {
                    name: newNotificationData.name,
                    creation: newNotificationData.creation,
                    description: newNotificationData.description,
                    docname: newNotificationData.docname,
                    document: newNotificationData.document,
                    event_id: newNotificationData.event_id,
                    project: newNotificationData.project,
                    recipient: newNotificationData.recipient,
                    recipient_role: newNotificationData.recipient_role,
                    // Ensure 'seen' conforms to the type (e.g., "true" | "false")
                    seen: newNotificationData.seen === 1 || newNotificationData.seen === "1" || newNotificationData.seen === true || newNotificationData.seen === "true" ? "true" : "false",
                    sender: newNotificationData?.sender ?? null,
                    title: newNotificationData.title,
                    type: newNotificationData.type,
                    work_package: newNotificationData?.work_package ?? '',
                    action_url: newNotificationData?.action_url ?? null,
                };
                add_new_notification(notification);
            }
        } catch (error) {
             console.error(`Error fetching notification ${event.notificationId}:`, error);
             // Maybe notify the user or log centrally
        }
    } else {
         console.warn("Received notification event without notificationId:", event);
    }
}

// --- Event Handlers ---
export const handlePRNewEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handlePRDeleteEvent = (event: any, delete_notification: DeleteNotificationCallback) => {
    if (event?.notificationId) {
        delete_notification(event.notificationId);
    } else {
        console.warn("Received delete event without notificationId:", event);
    }
};

export const handlePRVendorSelectedEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handleSBVendorSelectedEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handlePOAmendedEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handlePRApproveNewEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handlePONewEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handleSBNewEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handleSRVendorSelectedEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handleSRApprovedEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};

export const handleSOAmendedEvent = async (db: FrappeDB, event: any, add_new_notification: AddNotificationCallback) => {
    await handleNotification(db, event, add_new_notification);
};