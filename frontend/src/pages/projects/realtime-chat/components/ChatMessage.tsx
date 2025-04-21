// src/components/project/chat/ChatMessage.tsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Assuming Shadcn Avatar
import { ProjectDiscussionMessage } from '../types';
import { Download, FileIcon } from 'lucide-react';

interface ChatMessageProps {
  message: ProjectDiscussionMessage;
  isCurrentUser: boolean;
}

// Helper to get initials from a name
const getInitials = (name: string = ""): string => {
    const names = name.split(' ');
    if (names.length === 0 || !names[0]) return "?";
    const firstInitial = names[0][0];
    const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
};


// Helper to format file size
const formatFileSize = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Simple preview logic (can be expanded)
const isImage = (fileName: string): boolean => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);


export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, isCurrentUser }) => {
    const senderName = message.sender_full_name || message.sender || 'Unknown';
    const messageTime = new Date(message.timestamp); // Ensure timestamp is parsed correctly

    return (
        <div className={cn(
            "flex items-start gap-3 py-1", // Reduced vertical padding slightly
            isCurrentUser ? "justify-end" : "justify-start"
        )}>
            {/* Avatar for other users */}
            {!isCurrentUser && (
                <Avatar className="h-8 w-8 border">
                    {/* Add AvatarImage logic if you store user profile pics */}
                    {/* <AvatarImage src={message.sender_avatar_url} alt={senderName} /> */}
                    <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
                </Avatar>
            )}

            {/* Message Bubble */}
            <div className={cn(
                "max-w-[70%]",
                isCurrentUser ? "order-1" : "order-2" // Ensure correct ordering with avatar
            )}>
                <div className={cn(
                    "rounded-lg px-3 py-2 text-sm break-words shadow-sm", // Added subtle shadow
                    isCurrentUser
                        ? "bg-primary text-primary-foreground" // Use theme primary
                        : "bg-muted" // Use theme muted background
                )}>
                    {/* Show sender name above others' messages */}
                    {!isCurrentUser && (
                        <p className="font-semibold text-xs mb-1 text-blue-600 dark:text-blue-400">{senderName}</p>
                    )}
                    {/* Message Content (Render only if it exists) */}
                    {message.message_content && (
                        <p className="whitespace-pre-wrap mb-1">{message.message_content}</p>
                    )}
                </div>

                {/* Attachments Area */}
                {message.attachments && message.attachments.length > 0 && (
                        <div className={cn(
                            "mt-2 space-y-1.5 pt-1.5",
                             message.message_content ? "border-t border-current/20" : "" // Add border only if text exists
                        )}>
                            {message.attachments.map(att => (
                                <a
                                    key={att.name} // Use child doc name as key
                                    href={att.file_url}
                                    target="_blank" // Open in new tab
                                    rel="noopener noreferrer" // Security best practice
                                    download // Hint browser to download
                                    className={cn(
                                        "flex items-center gap-2 p-1.5 rounded border bg-background/50 hover:bg-background/80",
                                         isCurrentUser ? "border-primary-foreground/20" : "border-muted-foreground/20"
                                    )}
                                    title={`Download ${att.file_name}`}
                                >
                                     {/* Basic Image Preview */}
                                     {isImage(att.file_name) ? (
                                         <img src={att.file_url} alt={att.file_name} className="h-10 w-10 object-cover rounded shrink-0" />
                                     ) : (
                                        <FileIcon className="h-6 w-6 text-muted-foreground shrink-0" />
                                     )}
                                    <span className="text-xs truncate flex-grow">{att.file_name}</span>
                                    {/* Optional: Show file size if available from backend */}
                                    {/* <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(att.file_size || 0)}</span> */}
                                    <Download className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
                                </a>
                            ))}
                        </div>
                    )}
                <p className={cn(
                    "text-xs text-muted-foreground mt-1 px-1", // Add slight horizontal padding
                    isCurrentUser ? "text-right" : "text-left"
                )} title={messageTime.toLocaleString()}>
                    {/* More robust date parsing */}
                    {isNaN(messageTime.getTime())
                        ? 'Invalid date'
                        : formatDistanceToNow(messageTime, { addSuffix: true })}
                </p>
            </div>

             {/* Optional Avatar for current user (less common) */}
             {/* {isCurrentUser && (
                 <Avatar className="h-8 w-8 border">
                    <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
                 </Avatar>
            )} */}
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage'; // For better debugging