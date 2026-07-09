export type IngestionJobStatus =
  | 'PENDING'
  | 'PARSING'
  | 'CHUNKING'
  | 'SAVING'
  | 'COMPLETED'
  | 'FAILED';

export interface CreateIngestionJobResponse {
  jobId: number;
  filename: string;
  status: IngestionJobStatus;
  progress: number;
}

export interface IngestionJob {
  id: number;
  filename: string;
  store: string;
  strategy: string;
  chunkSize: number;
  overlap: number;
  status: IngestionJobStatus;
  progress: number;
  chunkCount: number | null;
}

export interface CreateRegulationJobPayload {
  file: File;
  strategy: string;
  chunkSize: number;
  overlap: number;
}
