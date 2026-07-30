export type IngestionJobStatus =
  | 'PENDING'
  | 'PARSING'
  | 'CHUNKING'
  | 'EMBEDDING'
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
  /** RegulationCategory enum name on the backend (e.g. 'MIFID_II'), optional. */
  category?: string;
  chunkSize: number;
  overlap: number;
}

/** Mirrors the backend's PageResponseDto<T>. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Query params accepted by GET /api/admin/regulations/jobs. */
export interface ListJobsParams {
  page: number;
  size: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: IngestionJobStatus | null;
}
