import { SourceCitation } from './report-query.model';

export interface ChatConversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number | string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: SourceCitation[];
  createdAt: string;
  pending?: boolean;
  error?: string;
}

export interface ChatStreamEvent {
  type: 'sources' | 'token' | 'completed' | 'error';
  content: string | null;
  sources: SourceCitation[] | null;
  error: string | null;
}
