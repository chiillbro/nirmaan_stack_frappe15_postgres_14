import { ProjectDiscussionMessage } from "./realtime-chat/types";


export const stressTestMessages: ProjectDiscussionMessage[] = Array.from({ length: 10000 }, (_, i) => ({
  name: `msg-${i}`,
  project: 'project-1',
  sender_full_name: 'system',
  message_content: `Message ${i + 1}`,
  timestamp: String(new Date()),
  sender: 'system',
  owner: 'system',
}));
