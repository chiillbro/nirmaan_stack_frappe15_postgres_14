// --- Interfaces ---
export interface FileInfo { // For sending to backend
  name: string; // File Doc name/ID
}
export interface ProjectMessageAttachment { // Received in payload
  name: string;
  file_name: string;
  file_url: string;
  is_private: number;
}

export type ProjectDiscussionMessage = {
    name: string;
    project: string;
    sender: string;
    message_content: string | null;
    timestamp: string;
    owner: string;
    sender_full_name?: string;
    attachments?: ProjectMessageAttachment[];
}

export type ProjectMessageDict = { // Backend return type for send_message
  name: string;
  project: string;
  sender: string;
  message_content: string | null;
  timestamp: string;
  owner: string;
  sender_full_name?: string; // Ensure backend sends this
  attachments?: ProjectMessageAttachment[];
}

export type TypingUsersMap = {
    [userId: string]: {
        name: string;
        timer: NodeJS.Timeout;
    };
}

export type UserData = {
    user_id: string;
    full_name?: string;
}

// *** NEW: Matches backend return type ***
export interface PaginatedMessagesResponse {
  messages: ProjectDiscussionMessage[]; // Assuming backend maps correctly
  has_more: boolean;
}


