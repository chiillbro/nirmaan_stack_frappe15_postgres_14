// src/hooks/useProjectChat.ts
import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import {
    useFrappeGetDocList,
    FrappeContext,
    FrappeConfig,
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeFileUpload
} from 'frappe-react-sdk';
import { useToast } from '@/components/ui/use-toast';
import { useUserData } from '@/hooks/useUserData'; // Your hook for user data
import { debounce, memoize } from 'lodash'; // Using lodash debounce as in original example
import { useUsersList } from '@/pages/ProcurementRequests/VendorQuotesSelection/hooks/useUsersList';
import { FileInfo, ProjectDiscussionMessage, TypingUsersMap, UserData } from '../types';

// Define the hook's return type for clarity
export interface UseProjectChatReturn {
    messages: ProjectDiscussionMessage[];
    typingUsers: TypingUsersMap;
    isLoading: boolean;
    isLoadingMore: boolean; // Loading previous messages
    hasMoreMessages: boolean; // Indicator for UI
    isSending: boolean;
    error: string | null;
    sendMessage: (messageContent: string | null, attachments?: FileInfo[]) => Promise<void>;
    uploadFile: (file: File, isPrivate: boolean) => Promise<FileInfo | null>; // Expose upload function
    isUploading: boolean; // Upload loading state
    updateTypingStatus: (isTyping: boolean) => void;
    loadPreviousMessages: () => void; // Expose function to load more
    currentUser: UserData | null;
}

// --- Custom Hook ---
export const useProjectChat = (projectName: string | null | undefined): UseProjectChatReturn => {
    // --- State ---
    const [messages, setMessages] = useState<ProjectDiscussionMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUsersMap>({});
    const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
    const [fetchErr, setFetchErr] = useState<string | null>(null);
    // *** NEW: State for pagination ***
    const [limitStart, setLimitStart] = useState<number>(0);
    const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true); // Assume true initially
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

    // --- Hooks ---
    //     // Specific hook for sending messages API
    const { call: callSendMessage, loading: isSendingMessage } = useFrappePostCall("nirmaan_stack.api.projects.project_chat.send_project_message");
    // Specific hook for typing status API
    const { call: callUpdateTyping } = useFrappePostCall("nirmaan_stack.api.projects.project_chat.update_typing_status");

     // *** NEW: Hook for fetching messages ***
     const { call: callGetMessages, loading: loadingGetMessages } = useFrappePostCall("nirmaan_stack.api.projects.project_chat.get_project_messages"
    );

    const {upload, loading: isUploading} = useFrappeFileUpload();
 

    const { toast } = useToast();
    const { socket } = useContext(FrappeContext) as FrappeConfig;
    const currentUser = useUserData();

    // --- Refs ---
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Configuration ---
    const MESSAGES_PER_PAGE = 50;
    const TYPING_INDICATOR_TIMEOUT = 3000;
    const TYPING_API_DEBOUNCE = 500;

    // const {data: usersList, isLoading: usersListLoading} = useUsersList();

    // const getUserFullName = useMemo(() => memoize((
    //     (id: string | undefined, defaultName: string) => {
    //         return usersList?.find((user) => user.name === id)?.full_name || defaultName;
    //     }
    // ), (id: string | undefined) => id) ,[usersList])

    // --- Action to Load Previous Messages ---
    const loadPreviousMessages = useCallback(async () => {
        if (!projectName || isLoadingMore || !hasMoreMessages) {
            // console.log("[useProjectChat] Skipping loadPreviousMessages:", { isLoadingMore, hasMoreMessages });
            return;
        }

        // console.log(`[useProjectChat] Loading previous messages, current count: ${messages.length}, next start: ${limitStart}`);
        setIsLoadingMore(true);
        setFetchErr(null); // Clear previous errors

        try {
            const response = await callGetMessages({
                project_name: projectName,
                limit: MESSAGES_PER_PAGE,
                start: limitStart // Fetch starting from the current offset
            });

            if (response && response.message && response.message.messages) {
                 // console.log(`[useProjectChat] Received ${response.messages.length} previous messages.`);
                 // Prepend new messages to the beginning of the array
                 setMessages(prevMessages => [...response.message.messages, ...prevMessages]);
                 // Update the starting point for the *next* fetch
                 setLimitStart(prevStart => prevStart + response.message.messages.length);
                 setHasMoreMessages(response.message.has_more);
            } else {
                // Handle case where response is empty or invalid
                 setHasMoreMessages(false); // Assume no more if response is weird
                 console.warn("[useProjectChat] Received empty or invalid response from get_project_messages");
            }

        } catch (err: any) {
            console.error("[useProjectChat] Error loading previous messages:", err);
            const message = `Failed to load older messages: ${err.message}`;
            setFetchErr(message);
            toast({ variant: "destructive", title: "Loading Error", description: message });
        } finally {
            setIsLoadingMore(false);
        }
    }, [projectName, isLoadingMore, hasMoreMessages, limitStart, callGetMessages, toast, MESSAGES_PER_PAGE]);

    // --- Initial Fetch Effect ---
    useEffect(() => {
        if (!projectName) {
             // Clear state if project changes to null/undefined
             setMessages([]);
             setIsLoadingInitial(true);
             setHasMoreMessages(true);
             setLimitStart(0);
             setFetchErr(null);
             return;
        };

        // Reset state for new project and trigger initial fetch
        setIsLoadingInitial(true);
        setMessages([]);
        setHasMoreMessages(true);
        setLimitStart(0); // Reset pagination offset
        setFetchErr(null);

        // Define async function for initial fetch
        const fetchInitialData = async () => {
             try {
                 // console.log(`[useProjectChat] Fetching initial messages for ${projectName}`);
                 const response = await callGetMessages({
                     project_name: projectName,
                     limit: MESSAGES_PER_PAGE,
                     start: 0 // Start from the beginning (newest)
                 });

                 console.log("response", response)

                 if (response && response.message && response.message.messages) {
                    console.log("response.message.messages", response.message.messages)
                     setMessages(response.message.messages);
                     setLimitStart(response.message.messages.length); // Set offset for next fetch
                     setHasMoreMessages(response.message.has_more);
                     // console.log(`[useProjectChat] Initial fetch success: ${response.messages.length} messages, hasMore: ${response.has_more}`);
                 } else {
                      console.warn("[useProjectChat] Initial fetch returned invalid data.");
                      setHasMoreMessages(false);
                 }
             } catch (err: any) {
                 console.error("[useProjectChat] Error fetching initial messages:", err);
                 const message = `Failed to load messages: ${err.message}`;
                 setFetchErr(message);
                 toast({ variant: "destructive", title: "Loading Error", description: message });
             } finally {
                 setIsLoadingInitial(false);
             }
         };

        fetchInitialData();

        // We only want this effect to run when projectName changes significantly
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectName, callGetMessages, toast, MESSAGES_PER_PAGE]); // Rerun ONLY if projectName changes

    // --- Data Fetching ---
    // const { isLoading: listIsLoading, error: listFetchError } = useFrappeGetDocList<ProjectDiscussionMessage>(
    //     'Project Discussion Message',
    //     {
    //         fields: ["name", "sender", "message_content", "timestamp", "owner", 'sender_full_name'],
    //         filters: projectName ? [["project", "=", projectName]] : [], // Prevent fetch if no projectName
    //         orderBy: { field: "timestamp", order: "asc" },
    //         limit: MESSAGES_PER_PAGE,
    //     },
    //     projectName ? `Project Discussion Messages ${projectName}` : null,
    //     { 
    //         onSuccess: (data: ProjectDiscussionMessage[]) => {
    //             const resolved = data.map(msg => ({
    //                 ...msg,
    //                 // Use the memoized helper or rely on backend data directly
    //                 sender_full_name: getUserFullName(msg.owner, msg.owner),
    //             }));
    //             setMessages(resolved);
    //             setIsLoadingInitial(false);
    //             setFetchErr(null);
    //         },
    //         onError: (err) => {
    //             const message = `Failed to load messages: ${err.message}`;
    //             setFetchErr(message);
    //             setIsLoadingInitial(false);
    //             toast({ variant: "destructive", title: "Loading Error", description: message });
    //         }
    //     }
    // );

    // Update combined loading state
    // const isLoading = isLoadingInitial || usersListLoading;

   // --- Socket Effects (Keep subscription, message handling, typing indicators) ---
    // useEffect(() => {
    //     if (!socket || !projectName) {
    //         // If socket exists but projectName becomes null, unsubscribe
    //         if (socket && typingTimeoutRef.current) { // Need a way to know previous projectName if needed
    //             // socket.emit('doc_unsubscribe', 'Projects', prevProjectName); // Requires tracking prevProjectName
    //         }
    //         return;
    //     };
    //     const doctype = 'Projects';
    //     socket.emit('doc_subscribe', doctype, projectName);
    //     // console.log(`[useProjectChat] Subscribed to doc: ${doctype}/${projectName}`);
    //     return () => {
    //         if(socket) {
    //             socket.emit('doc_unsubscribe', doctype, projectName);
    //             // console.log(`[useProjectChat] Unsubscribed from doc: ${doctype}/${projectName}`);
    //         }
    //     };
    // }, [socket, projectName]); // Dependency on projectName is key

    // Effect: Handle Incoming Messages
    // useEffect(() => {
    //     if (!socket || !projectName) return; // Ensure projectName check
    //     const handleNewMessage = (newMessageData: ProjectDiscussionMessage) => {
    //       if (newMessageData?.project === projectName) {
    //         setMessages(current => {
    //             // Add only if not already present (handles potential echo)
    //             return current.some(m => m.name === newMessageData.name) ? current : [...current, newMessageData];
    //         });
    //     }
    //     };
    //     socket.on('new_project_message', handleNewMessage);
    //     return () => { socket.off('new_project_message', handleNewMessage); };
    // }, [socket, projectName]);

    // --- Socket Effects (Keep subscription, message handling, typing indicators) ---
    useEffect(() => { // Subscription Effect
        if (!socket || !projectName) return;
        const doctype = 'Projects';
        socket.emit('doc_subscribe', doctype, projectName);
        return () => { if(socket) socket.emit('doc_unsubscribe', doctype, projectName); };
    }, [socket, projectName]);

    useEffect(() => { // Incoming Message Effect
        if (!socket || !projectName) return;
        const handleNewMessage = (newMessageData: ProjectDiscussionMessage) => {
             if (newMessageData?.project === projectName) {
                 setMessages(current => {
                    //  const resolvedMessage = { ...newMessageData, sender_full_name: getUserFullName(newMessageData.owner, newMessageData.sender_full_name) };
                     return current.some(m => m.name === newMessageData.name) ? current : [...current, newMessageData];
                 });
                 // When a new message arrives, reset pagination if desired,
                 // or assume it's appended correctly and doesn't affect history loading.
                 // For simplicity, we won't reset limitStart here.
             }
        };
        socket.on('new_project_message', handleNewMessage);
        return () => { socket.off('new_project_message', handleNewMessage); };
    }, [socket, projectName]);


    // Effect: Handle Incoming Typing Indicators
    useEffect(() => {
        if (!socket || !currentUser?.user_id || !projectName) return; // Ensure projectName check

        const handleStartTyping = (data: { user: string; user_full_name: string; project: string }) => {
            if (data.project === projectName && data.user !== currentUser.user_id) {
                setTypingUsers(prev => {
                    if (prev[data.user]?.timer) clearTimeout(prev[data.user].timer);
                    const timer = setTimeout(() => {
                        setTypingUsers(current => {
                            const { [data.user]: _, ...rest } = current;
                            return current;
                        });
                    }, TYPING_INDICATOR_TIMEOUT + 500);
                    return { ...prev, [data.user]: { name: data.user_full_name || data.user, timer } };
                });
            }
        };
        const handleStopTyping = (data: { user: string; project: string }) => {
             if (data.project === projectName && data.user !== currentUser.user_id) {
                 setTypingUsers(prev => {
                     if (prev[data.user]) {
                         clearTimeout(prev[data.user].timer);
                         const { [data.user]: _, ...rest } = prev;
                         return rest;
                     }
                     return prev;
                 });
             }
        };

        socket.on('start_typing_project_chat', handleStartTyping);
        socket.on('stop_typing_project_chat', handleStopTyping);
        return () => {
            socket.off('start_typing_project_chat', handleStartTyping);
            socket.off('stop_typing_project_chat', handleStopTyping);
            setTypingUsers(prev => {
                Object.values(prev).forEach(({ timer }) => clearTimeout(timer));
                return {};
            });
        };
    }, [socket, projectName, currentUser?.user_id]);

    // --- Debounced API call for Typing Status ---
    // Use useCallback to ensure the debounced function doesn't change unnecessarily
     const debouncedUpdateTypingStatus = useCallback(
        debounce(
            (isTyping: boolean) => {
                if (!projectName) return; // Guard against missing project name
                callUpdateTyping({ project_name: projectName, is_typing: isTyping })
                    .catch(err => console.warn("[useProjectChat] Failed to update typing status:", err));
            },
            TYPING_API_DEBOUNCE,
            { leading: true, trailing: true } // Adjust debounce options if needed
        ),
        [projectName, callUpdateTyping] // Dependencies for the debounce setup
    );


    // --- Actions Exposed by the Hook ---

    const sendMessage = useCallback(async (messageContent: string | null, attachments: FileInfo[] = [] ) => {
        console.log("sendMessage", messageContent, attachments)
        const trimmedContent = messageContent?.trim() ?? null;
        if (!projectName || (!trimmedContent && attachments.length === 0)) {
            console.warn("[useProjectChat] sendMessage called with no project or empty content/attachments.");
            toast({ variant: "destructive", title: "Cannot Send", description: "Message or attachment required." });
            return;
        }
        try {
            await callSendMessage({
                project_name: projectName,
                message_content: trimmedContent,
                attachments: attachments.map(att => ({ name: att.name })),
            });
             // Optimistic update could happen here, but socket echo handles it
        } catch (err: any) {
            console.error("[useProjectChat] Error sending message:", err);
            toast({
                variant: "destructive",
                title: "Send Error",
                description: err?.message || "Failed to send message.",
            });
            throw err; // Re-throw so the caller knows about the failure
        }
    }, [projectName, callSendMessage, toast]);


    // *** NEW: Expose file upload functionality ***
    const uploadFile = useCallback(async (file: File, isPrivate: boolean = true): Promise<FileInfo | null> => {
        if (!projectName) {
             toast({ variant: "destructive", title: "Upload Error", description: "Cannot upload file without a project context." });
            return null;
        }
        try {
            const response = await upload(file, {
                /** Optional: If you want to link the file to the project immediately upon upload
                 * (before it's attached to a message), you can specify doctype/docname.
                 * This helps with permissions and finding orphaned files later.
                 * Set this based on your desired file management strategy.
                 * If set, ensure user has write permission on the Project doc.
                 */
                // doctype: "Projects",
                // docname: projectName,

                isPrivate: isPrivate, // Files attached to project chat should usually be private
                // folder: `Home/Attachments/Project Chat/${projectName}` // Optional: Organize uploads
            });
            // The 'response' from useFrappeFileUpload should contain the File document details
            if (response?.name) {
                 toast({ variant: "success", title: "File Uploaded", description: response.file_name });
                 return { name: response.name }; // Return the necessary info for sending
            } else {
                 throw new Error("Upload response did not contain file name.");
            }
        } catch (err: any) {
            console.error("[useProjectChat] File upload error:", err);
            toast({ variant: "destructive", title: "Upload Failed", description: err.message || "Could not upload file." });
            return null;
        }
    }, [upload, toast, projectName]);

    const updateTypingStatus = useCallback((isTyping: boolean) => {
         // Clear any existing local timeout when status changes explicitly
         if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        // Call the debounced function to notify backend
        debouncedUpdateTypingStatus(isTyping);

        // Set local timeout only when starting to type locally
        if (isTyping) {
             typingTimeoutRef.current = setTimeout(() => {
                 // If timeout fires, it means user stopped typing locally
                //  debouncedUpdateTypingStatus(false);
                 typingTimeoutRef.current = null;
             }, TYPING_INDICATOR_TIMEOUT);
        }

    }, [debouncedUpdateTypingStatus]);


    // --- Cleanup local typing timer on unmount ---
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
             // Also cancel any pending debounced calls on unmount
             debouncedUpdateTypingStatus.cancel();
        };
    }, [debouncedUpdateTypingStatus]);


    // --- Return Value ---
    return {
        messages,
        typingUsers,
        isLoading: isLoadingInitial || loadingGetMessages, // Combined loading state
        isLoadingMore, // Separate flag for loading previous messages
        hasMoreMessages, // Indicator for UI
        isSending: isSendingMessage, // State from the API call hook
        error: fetchErr || null, // Combined error state
        isUploading,
        uploadFile,
        sendMessage,
        updateTypingStatus,
        loadPreviousMessages,
        currentUser,
    };
};