// import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
// import {
//     useFrappeGetDocList,
//     FrappeContext,
//     FrappeConfig,
//     useFrappePostCall
// } from 'frappe-react-sdk';
// import { useToast } from '@/components/ui/use-toast';
// import { useUserData } from '@/hooks/useUserData'; // Your hook for user data
// import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { VirtualizedMessageList } from './components/VirtualizedMessagesList';
// import { ChatInput } from './components/ChatInput';
// import { useUsersList } from '@/pages/ProcurementRequests/VendorQuotesSelection/hooks/useUsersList';
// import { memoize } from 'lodash';

// // --- Interfaces ---
// interface ProjectDiscussionMessage {
//     name: string;
//     project: string;
//     sender: string;
//     message_content: string;
//     timestamp: string;
//     owner: string;
//     sender_full_name?: string;
// }

// interface ProjectMessageDict { // Backend return type
//     name: string;
//     project: string;
//     sender: string;
//     message_content: string;
//     timestamp: string;
//     owner: string;
// }

// interface TypingUsersMap {
//     [userId: string]: {
//         name: string;
//         timer: NodeJS.Timeout;
//     };
// }

// interface ProjectChatContainerProps {
//     projectName: string;
// }


// // --- Container Component ---
// export const ProjectChatContainer: React.FC<ProjectChatContainerProps> = ({ projectName }) => {
//     // --- State ---
//     const [messages, setMessages] = useState<ProjectDiscussionMessage[]>([]);
//     const [typingUsers, setTypingUsers] = useState<TypingUsersMap>({});
//     const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
//     const [fetchErr, setFetchErr] = useState<string | null>(null);
//      // TODO: Add state for pagination (pageNum, hasMore, isLoadingMore)

//     // --- Hooks ---
// //     // Specific hook for sending messages API
//     const { call: callSendMessage, loading: isSendingMessage } = useFrappePostCall("nirmaan_stack.api.projects.project_chat.send_project_message");
//      // Specific hook for typing status API
//     const { call: callUpdateTyping } = useFrappePostCall("nirmaan_stack.api.projects.project_chat.update_typing_status");

//     const { toast } = useToast();
//     const { socket } = useContext(FrappeContext) as FrappeConfig;
//     const currentUser = useUserData();

//     // --- Configuration ---
//     const MESSAGES_PER_PAGE = 50; // Increase page size for virtualization
//     const TYPING_INDICATOR_TIMEOUT = 3000;

//     const {data: usersList, isLoading: usersListLoading} = useUsersList();

//     const getUserName = useMemo(() => memoize((
//         (id: string | undefined) => {
//             return usersList?.find((user) => user.name === id)?.full_name || "";
//         }
//     ), (id: string | undefined) => id) ,[usersList])

//      // --- Data Fetching ---
//     const _ = useFrappeGetDocList<ProjectDiscussionMessage>('Project Discussion Message', {
//         fields: ["name", "sender", "message_content", "timestamp", "owner"], // Fetch full name if optimized
//         filters: [["project", "=", projectName]],
//         orderBy: { field: "timestamp", order: "asc" },
//         limit: MESSAGES_PER_PAGE,
//         // limit_start needed for pagination
//     }, projectName ? undefined : null, {
//         onSuccess: (data) => {
//              // Basic resolution or rely on backend data
//              const resolved = data.map((msg: ProjectMessageDict) => ({ ...msg, sender_full_name: getUserName(msg.owner) || msg.owner }));
//             setMessages(resolved);
//             setIsLoadingInitial(false);
//             setFetchErr(null);
//             // console.log("[Container] Initial messages loaded:", resolved.length);
//         },
//         onError: (err) => {
//             const message = `Failed to load messages: ${err.message}`;
//             setFetchErr(message);
//             setIsLoadingInitial(false);
//             toast({ variant: "destructive", title: "Loading Error", description: message });
//              console.error("[Container] Error loading initial messages:", err);
//         }
//     });

//      // --- Effects ---

//     // Effect: Socket.IO Document Subscription
//     useEffect(() => {
//         if (!socket || !projectName) return;
//         const doctype = 'Projects';
//         socket.emit('doc_subscribe', doctype, projectName);
//         return () => { if(socket) socket.emit('doc_unsubscribe', doctype, projectName); };
//     }, [socket, projectName]);

//     // Effect: Handle Incoming Messages
//     useEffect(() => {
//         if (!socket) return;
//         const handleNewMessage = (newMessageData: ProjectDiscussionMessage) => {
//             console.log("new message data", newMessageData);
//              if (newMessageData?.project === projectName) {
//                  setMessages(current => {
//                      // Add only if not already present (handles potential echo)
//                      return current.some(m => m.name === newMessageData.name) ? current : [...current, newMessageData];
//                  });
//              }
//         };
//         socket.on('new_project_message', handleNewMessage);
//         return () => { socket.off('new_project_message', handleNewMessage); };
//     }, [socket, projectName]);

//     // Effect: Handle Incoming Typing Indicators
//     useEffect(() => {
//         if (!socket || !currentUser?.user_id) return;

//         const handleStartTyping = (data: { user: string; user_full_name: string; project: string }) => {
//             if (data.project === projectName && data.user !== currentUser.user_id) {
//                 setTypingUsers(prev => {
//                     if (prev[data.user]?.timer) clearTimeout(prev[data.user].timer);
//                     const timer = setTimeout(() => {
//                         setTypingUsers(current => {
//                             const { [data.user]: _, ...rest } = current; return current;
//                         });
//                     }, TYPING_INDICATOR_TIMEOUT + 500);
//                     return { ...prev, [data.user]: { name: data.user_full_name || data.user, timer } };
//                 });
//             }
//         };
//         const handleStopTyping = (data: { user: string; project: string }) => {
//              if (data.project === projectName && data.user !== currentUser.user_id) {
//                  setTypingUsers(prev => {
//                      if (prev[data.user]) {
//                          clearTimeout(prev[data.user].timer);
//                          const { [data.user]: _, ...rest } = prev;
//                          return rest;
//                      }
//                      return prev;
//                  });
//              }
//         };

//         socket.on('start_typing_project_chat', handleStartTyping);
//         socket.on('stop_typing_project_chat', handleStopTyping);
//         return () => {
//             socket.off('start_typing_project_chat', handleStartTyping);
//             socket.off('stop_typing_project_chat', handleStopTyping);
//             setTypingUsers(prev => { // Clear timers on unmount/project change
//                 Object.values(prev).forEach(({ timer }) => clearTimeout(timer));
//                 return {};
//             });
//         };
//     }, [socket, projectName, currentUser?.user_id]);


//     // --- Callbacks for Child Components ---

//     const handleSendMessage = useCallback(async (messageContent: string) => {
//         if (!projectName) return;
//         try {
//             await callSendMessage({
//                 project_name: projectName,
//                 message_content: messageContent,
//             });
//             // Message state updates via socket listener, no optimistic update needed here
//             // unless desired for immediate feedback (then handle potential duplicates).
//         } catch (err: any) {
//             console.error("[Container] Error sending message:", err);
//             toast({
//                 variant: "destructive",
//                 title: "Send Error",
//                 description: err?.message || "Failed to send message.",
//             });
//             // Re-throw or handle as needed if ChatInput needs to know about the error
//             throw err;
//         }
//     }, [projectName, callSendMessage, toast]);


//     const handleTypingStatusChange = useCallback((isTyping: boolean) => {
//         if (!projectName) return;
//         callUpdateTyping({ project_name: projectName, is_typing: isTyping })
//             .catch(err => console.warn("[Container] Failed to update typing status:", err)); // Log silently maybe
//     }, [projectName, callUpdateTyping]);

//      // TODO: Implement handleScrollNearTop for pagination


//     // --- Render Logic ---
//     return (
//          <Card className="flex flex-col h-[70vh] md:h-[75vh]"> {/* Responsive Height */}
//             <CardHeader className="py-3 px-4"> {/* Reduced padding */}
//                 <CardTitle className="text-lg">Project Discussion</CardTitle> {/* Slightly smaller title */}
//             </CardHeader>
//             <Separator/>
//             <CardContent className="flex-1 overflow-hidden p-0"> {/* No padding, handled by list */}
//                 <VirtualizedMessageList
//                     messages={messages}
//                     typingUsers={typingUsers}
//                     currentUser={currentUser}
//                     isLoading={isLoadingInitial || usersListLoading} // Pass initial loading state
//                     error={fetchErr}
//                     // listHeight="calc(100% - 24px)" // Adjust if typing indicator outside list
//                     // onScrollNearTop={handleScrollNearTop} // Pass pagination callback
//                 />
//             </CardContent>
//             <Separator/>
//             <CardFooter className="p-3"> {/* Reduced padding */}
//                 <ChatInput
//                     onSendMessage={handleSendMessage}
//                     onTypingStatusChange={handleTypingStatusChange}
//                     isSending={isSendingMessage} // Pass loading state
//                 />
//             </CardFooter>
//         </Card>
//     );
// };


// src/components/project/ProjectChatContainer.tsx
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProjectChat } from './hooks/useProjectChat';
import { VirtualizedMessageList } from './components/VirtualizedMessagesList';
import { ChatInput } from './components/ChatInput';

interface ProjectChatContainerProps {
    projectName: string;
}

export const ProjectChatContainer: React.FC<ProjectChatContainerProps> = ({ projectName }) => {

    const {
        messages,
        typingUsers,
        isLoading,      // Initial load
        isLoadingMore,  // Loading previous
        hasMoreMessages, // Can load more?
        isSending,
        error,
        sendMessage,
        updateTypingStatus,
        loadPreviousMessages, // *** NEW: Get load function from hook ***
        currentUser,
        uploadFile,
        isUploading,
    } = useProjectChat(projectName);

    return (
         <Card className="flex flex-col h-[70vh] md:h-[75vh]">
            <CardHeader className="py-3 px-4 shrink-0">
                <CardTitle className="text-lg">Project Discussion</CardTitle>
            </CardHeader>
            <Separator className="shrink-0"/>
            <CardContent className="flex-1 overflow-hidden p-0">
                <VirtualizedMessageList
                    messages={messages}
                    typingUsers={typingUsers}
                    currentUser={currentUser}
                    isLoading={isLoading}
                    isLoadingMore={isLoadingMore}     // *** Pass prop ***
                    hasMoreMessages={hasMoreMessages} // *** Pass prop ***
                    error={error}
                    onLoadMore={loadPreviousMessages} // *** Pass callback ***
                />
            </CardContent>
            <Separator className="shrink-0"/>
            <CardFooter className="p-3 shrink-0">
                 <ChatInput
                    uploadFile={uploadFile}
                    isUploading={isUploading}
                    onSendMessage={sendMessage}
                    onTypingStatusChange={updateTypingStatus}
                    isSending={isSending}
                />
            </CardFooter>
        </Card>
    );
};