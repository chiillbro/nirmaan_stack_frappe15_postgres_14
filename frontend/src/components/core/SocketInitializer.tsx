// import React, { useContext, useEffect, useRef } from 'react';
// import { FrappeConfig, FrappeContext } from 'frappe-react-sdk';
// import { useNotificationStore } from '@/zustand/useNotificationStore';
// import { UserContext } from '@/utils/auth/UserProvider'; // If needed for role/user_id
// import { useDataRefetchStore } from '@/zustand/useDataRefetchStore';
// import { initializeSocketListeners } from '@/services/socketListeners';

// /**
//  * A non-rendering component responsible for initializing global socket listeners
//  * once the necessary context (socket, db) is available.
//  */
// export const SocketInitializer: React.FC = () => {
//     const { socket, db } = useContext(FrappeContext) as FrappeConfig; // Use FrappeConfig or specific type

//     // Select only the action functions from the stores to avoid unnecessary re-renders
//     const notificationActions = useNotificationStore(state => ({
//         add_new_notification: state.add_new_notification,
//         delete_notification: state.delete_notification,
//         add_all_notific_directly: state.add_all_notific_directly,
//         clear_notifications: state.clear_notifications
//     }));

//     const refetchActions = useDataRefetchStore(state => ({
//         triggerPrRefetch: state.triggerPrRefetch,
//         triggerSbRefetch: state.triggerSbRefetch,
//         triggerPoRefetch: state.triggerPoRefetch,
//         triggerSrRefetch: state.triggerSrRefetch,
//         triggerPaymentRefetch: state.triggerPaymentRefetch,
//         triggerNotificationRefetch: state.triggerNotificationRefetch,
//     }));

//     // const { user } = useContext(UserContext); // Get user info if needed by listeners
//     const initialized = useRef(false); // Prevent double initialization in StrictMode

//     useEffect(() => {
//         // Ensure socket and db are available and not already initialized
//         if (socket && db && !initialized.current) {
//              // Check if the socket is already connected from FrappeProvider
//              if (socket.connected) {
//                  console.log("Socket already connected on Initializer mount:", socket.id);
//              } else {
//                  // Optional: You might want to explicitly connect if the provider doesn't guarantee it
//                  // but FrappeProvider usually handles this.
//                  // socket.connect();
//              }

//             const cleanupListeners = initializeSocketListeners({
//                 socket,
//                 db,
//                 notificationActions,
//                 refetchActions,
//                 // Pass role/user_id if needed:
//                 // userRole: user?.role_profile,
//                 // userId: user?.name
//             });

//             initialized.current = true; // Mark as initialized

//             // Return the cleanup function
//             return () => {
//                 cleanupListeners();
//                 initialized.current = false; // Reset on unmount/cleanup
//                  // Optional: Decide if you want to disconnect the socket when the app unmounts entirely
//                  // Usually FrappeProvider handles this lifecycle. Avoid manual disconnect here
//                  // unless you have a specific reason.
//                  // if (socket.connected) {
//                  //     socket.disconnect();
//                  //     console.log("Socket disconnected on Initializer unmount.");
//                  // }
//             };
//         }

//         // Add dependencies: socket, db, and potentially stable action references if they change
//     }, [socket, db, notificationActions, refetchActions]); // Add user if passed as dependency

//     // This component doesn't render anything itself
//     return null;
// };


// src/components/core/SocketInitializer.tsx
import React, { useContext, useEffect, useRef } from 'react';
import { FrappeConfig, FrappeContext } from 'frappe-react-sdk';
import {
    initializeSocketListeners,
    NotificationServiceActions, // Import the service action interfaces
    DataRefetchServiceActions
} from '@/services/socketListeners';
import { useNotificationStore } from '@/zustand/useNotificationStore';
import { useDataRefetchStore } from '@/zustand/useDataRefetchStore';

export const SocketInitializer: React.FC = () => {
    const { socket, db } = useContext(FrappeContext) as FrappeConfig;

    // Get the entire store instances
    const notificationStore = useNotificationStore();
    const refetchStore = useDataRefetchStore();

    const initialized = useRef(false);

    useEffect(() => {
        // Ensure socket and db are available and not already initialized
        if (socket && db && notificationStore && refetchStore && !initialized.current) {

            if (socket.connected) {
                console.log("Socket already connected on Initializer mount:", socket.id);
            }

            // Create action objects conforming to the service interfaces
            const notificationActions: NotificationServiceActions = {
                add_new_notification: notificationStore.add_new_notification,
                delete_notification: notificationStore.delete_notification,
            };

            const refetchActions: DataRefetchServiceActions = {
                triggerPrRefetch: refetchStore.triggerPrRefetch,
                triggerSbRefetch: refetchStore.triggerSbRefetch,
                triggerPoRefetch: refetchStore.triggerPoRefetch,
                triggerSrRefetch: refetchStore.triggerSrRefetch,
                triggerPaymentRefetch: refetchStore.triggerPaymentRefetch,
                triggerNotificationRefetch: refetchStore.triggerNotificationRefetch,
            };

            // Pass the correctly typed action objects
            const cleanupListeners = initializeSocketListeners({
                socket,
                db,
                notificationActions,
                refetchActions,
            });

            initialized.current = true;

            return () => {
                cleanupListeners();
                initialized.current = false;
            };
        }

    // Depend on the store instances themselves. Zustand optimizes re-renders internally.
    }, [socket, db, notificationStore, refetchStore]);

    return null;
};