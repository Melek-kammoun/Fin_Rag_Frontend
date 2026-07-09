export type ReportIngestionStatus =
  | 'PENDING'
  | 'PARSING'
  | 'CHUNKING'
  | 'SAVING'
  | 'COMPLETED'
  | 'FAILED';

export interface FinReport {
  id: number;
  filename: string;
  status: ReportIngestionStatus;
  chunkCount: number | null;
  uploadedAt: string;
}

export interface UploadReportResponse {
  reportId: number;
  filename: string;
  status: ReportIngestionStatus;
}

export interface SourceCitation {
  filename: string;
  page: number | null;
  score: number;
}

export interface AskQuestionRequest {
  question: string;
  reportId?: number | null;
}

export interface AskQuestionResponse {
  answer: string;
  sources: SourceCitation[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  createdAt: string;
  pending?: boolean;
  error?: string;
}
