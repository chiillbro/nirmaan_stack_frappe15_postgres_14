// src/components/project/chat/ChatInput.tsx
import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileIcon, Loader2, Paperclip, SendHorizonal, X } from 'lucide-react'; // Send Icon
import { debounce } from 'lodash';
import { toast } from '@/components/ui/use-toast';

// Interface for managing file state within the input component
interface UploadedFileInfo {
    name: string; // File Doc name/ID from backend
    fileName: string; // Original file name for display
    file?: File; // Original File object (optional, for display/preview)
}

// Interface expected by the hook
interface FileInfoToSend {
    name: string;
}

interface ChatInputProps {
    onSendMessage: (message: string | null, attachments?: FileInfoToSend[]) => Promise<void>; // Callback to send message
    onTypingStatusChange: (isTyping: boolean) => void; // Callback for typing status
    uploadFile: (file: File, isPrivate: boolean) => Promise<FileInfoToSend | null>; // Callback to upload file
    isSending: boolean; // Is a message currently being sent?
    isUploading: boolean; // Is an upload in progress?
}

const TYPING_INDICATOR_TIMEOUT = 3000; // ms
const TYPING_API_DEBOUNCE = 500; // ms

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    onTypingStatusChange,
    isSending,
    isUploading,
    uploadFile
}) => {
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<UploadedFileInfo[]>([]); // State for staged files

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounced call to update typing status via prop
    const debouncedUpdateTypingStatus = debounce(
        onTypingStatusChange, // Call the prop function directly
        TYPING_API_DEBOUNCE
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        setMessage(value);

        // Typing indicator logic
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        } else {
            // Only call "start typing" if not already considered typing
            debouncedUpdateTypingStatus(true);
        }

        typingTimeoutRef.current = setTimeout(() => {
            // User stopped typing
            debouncedUpdateTypingStatus(false);
            typingTimeoutRef.current = null;
        }, TYPING_INDICATOR_TIMEOUT);
    };

    // Trigger hidden file input click
    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file selection and trigger upload
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        console.log("files", files, files?.length)
        if (!files || files.length === 0) return;

        // Basic validation (e.g., max number of files)
        if (attachments.length + files.length > 5) { // Example limit
             toast({ variant: "destructive", title: "Upload Limit", description: "Maximum 5 attachments allowed per message." });
             return;
        }

        // Reset file input value to allow selecting the same file again
        // event.target.value = '';

        // Upload files one by one (can be parallelized if needed)
        for (const file of Array.from(files)) {
            console.log("file", file)
            // Size validation (e.g., 10MB)
            if (file.size > 10 * 1024 * 1024) {
                 toast({ variant: "destructive", title: "File Too Large", description: `${file.name} exceeds the 10MB limit.` });
                 continue; // Skip this file
            }

            const uploadedFileInfo = await uploadFile(file, true); // Assume private
            console.log("uploadedFileInfo", uploadedFileInfo)
            if (uploadedFileInfo) {
                setAttachments(prev => [
                    ...prev,
                    { name: uploadedFileInfo.name, fileName: file.name, file: file } // Store details
                ]);
            }
            // `uploadFile` handles its own loading state and toasts internally
        }
    };

    // Remove a staged attachment
    const handleRemoveAttachment = (fileNameToRemove: string) => {
        setAttachments(prev => prev.filter(f => f.fileName !== fileNameToRemove));
        // Note: This doesn't delete the file from the server, just removes it from the current message draft.
        // Implementing server-side deletion if a user removes *before* sending is complex.
    };

    const handleSend = useCallback(async () => {
        const trimmedMessage = message.trim();
        if ((!trimmedMessage && attachments.length === 0) || isSending || isUploading) return;

        // --- Signal stop typing immediately ---
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            // typingTimeoutRef.current = null;
        }
        debouncedUpdateTypingStatus.cancel(); // Cancel any pending debounced call
        onTypingStatusChange(false); // Signal stop typing
        // ---

        try {
            // Prepare attachments data (only send the 'name' / ID)
            const attachmentsToSend = attachments.map(att => ({ name: att.name }));
            await onSendMessage(trimmedMessage || null, attachmentsToSend);
            setMessage(''); // Clear input only on successful send
            setAttachments([]); // Clear attachments
        } catch (error) {
            // Error is handled by the parent component (via toast)
            console.error("ChatInput: send message failed", error);
        }
    }, [message, attachments, isUploading, isSending, onSendMessage, onTypingStatusChange, debouncedUpdateTypingStatus]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
            textAreaRef.current?.focus(); // Re-focus after sending
        }
    };

    console.log("attachments", attachments)

    // return (
    //     <div className="flex items-end space-x-2 w-full"> {/* Use items-end to align button with bottom of textarea */}
    //         <Textarea
    //             ref={textAreaRef}
    //             placeholder="Type your message..."
    //             value={message}
    //             onChange={handleInputChange}
    //             onKeyDown={handleKeyDown}
    //             rows={1} // Start with 1 row
    //             className="flex-grow resize-none max-h-24 overflow-y-auto border rounded-md py-2 px-3 text-sm focus-visible:ring-1 focus-visible:ring-ring" // Adjusted styling
    //             disabled={isSending}
    //         />
    //         <Button
    //             size="icon"
    //             onClick={handleSend}
    //             disabled={!message.trim() || isSending}
    //             aria-label="Send message"
    //             className="shrink-0" // Prevent button from shrinking
    //         >
    //             {isSending ? (
    //                 <div className="h-4 w-4 border-2 border-background border-t-primary rounded-full animate-spin" /> // Simple spinner
    //             ) : (
    //                 <SendHorizonal className="h-4 w-4" />
    //             )}
    //         </Button>
    //     </div>
    // );

    return (
        <div className='w-full space-y-2'>
             {/* Staged Attachments Preview */}
             {attachments.length > 0 && (
                 <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50 max-h-28 overflow-y-auto">
                     {attachments.map((att) => (
                         <div key={att.name} className="flex items-center gap-2 bg-background border rounded-full px-2 py-0.5 text-xs">
                             <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                             <span className="truncate max-w-xs" title={att.fileName}>{att.fileName}</span>
                             <button
                                onClick={() => handleRemoveAttachment(att.fileName)}
                                disabled={isSending || isUploading}
                                className="ml-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                aria-label={`Remove ${att.fileName}`}
                            >
                                 <X className="h-3 w-3" />
                             </button>
                         </div>
                     ))}
                 </div>
             )}

            {/* Main Input Area */}
            <div className="flex items-end space-x-2">
                 {/* Hidden File Input */}
                 <input
                    type="file"
                    multiple // Allow multiple file selection
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" // Example accepted types
                 />

                 {/* Attach Button */}
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAttachClick}
                    disabled={isSending || isUploading}
                    aria-label="Attach files"
                    className="shrink-0 text-muted-foreground hover:text-primary"
                >
                    {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Paperclip className="h-5 w-5" />
                    )}
                 </Button>

                {/* Text Input */}
                <Textarea
                    ref={textAreaRef}
                    placeholder="Type your message or attach files..."
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="flex-grow resize-none max-h-24 overflow-y-auto border rounded-md py-2 px-3 text-sm focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={isSending || isUploading} // Disable while sending or uploading
                />

                {/* Send Button */}
                <Button
                    size="icon"
                    onClick={handleSend}
                    // Disable if sending, uploading, OR if both message and attachments are empty
                    disabled={isSending || isUploading || (!message.trim() && attachments.length === 0)}
                    aria-label="Send message"
                    className="shrink-0"
                >
                    {isSending ? (
                        <div className="h-4 w-4 border-2 border-background border-t-primary rounded-full animate-spin" />
                    ) : (
                        <SendHorizonal className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    )
};