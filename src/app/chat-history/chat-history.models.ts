export interface SourceCitation {
  filename: string;
  page: number | null;
  score: number;
}

export interface ChatConversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatRole = 'USER' | 'ASSISTANT';

export interface ChatMessage {
  id?: number;
  role: ChatRole;
  content: string;
  sources: SourceCitation[];
  createdAt?: string;
  streaming?: boolean;
  error?: boolean;
}

export type ChatStreamEventType =
  | 'sources'
  | 'token'
  | 'completed'
  | 'error';

export interface ChatStreamEvent {
  type: ChatStreamEventType;
  content: string | null;
  sources: SourceCitation[] | null;
  error: string | null;
}
