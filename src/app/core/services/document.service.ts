import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IngestionResponseDto {
  success: boolean;
  durationMs: number;
  chunkCount: number;
  error: string;
}

export interface ProcessJobStartedDto {
  jobId: string;
}

export type IngestionJobStatus = 'PENDING' | 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'DONE' | 'FAILED';

export interface ProcessJobStatusDto {
  jobId: string;
  status: IngestionJobStatus;
  message: string;
  result: IngestionResponseDto | null;
}

export interface IngestionHistoryDto {
  id: number;
  filename: string;
  strategy: string;
  chunkCount: number;
  durationMs: number;
  success: boolean;
  error: string;
  pdfReference: string | null;
  createdAt: string;
}

export interface PagedHistoryDto {
  content: IngestionHistoryDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface IngestionConfig {
  strategy: string;
  chunkSize: number;
  overlap: number;
}

const STORE_INGESTION_CONFIG: Record<string, IngestionConfig> = {
  'fin-reports': { strategy: 'SECTION', chunkSize: 800, overlap: 150 },
  'fin-regulation': { strategy: 'ARTICLE', chunkSize: 300, overlap: 50 }
};

// Le backend enregistre son vector store sous "fin-report" (singulier), différent
// de l'identifiant "fin-reports" utilisé côté routes/composants Angular.
const STORE_BACKEND_ID: Record<string, string> = {
  'fin-reports': 'fin-report',
  'fin-regulation': 'fin-regulation'
};

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private baseUrl = 'http://localhost:8081/api/ingestion';

  constructor(private http: HttpClient) {}

  processDocument(store: string, file: File): Observable<ProcessJobStartedDto> {
    const { strategy, chunkSize, overlap } = STORE_INGESTION_CONFIG[store];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('strategy', strategy);
    formData.append('chunkSize', chunkSize.toString());
    formData.append('overlap', overlap.toString());

    return this.http.post<ProcessJobStartedDto>(
      `${this.baseUrl}/${STORE_BACKEND_ID[store]}/process`,
      formData
    );
  }

  getProcessStatus(jobId: string): Observable<ProcessJobStatusDto> {
    return this.http.get<ProcessJobStatusDto>(`${this.baseUrl}/process/status/${jobId}`);
  }

  getHistory(store: string, filename: string = '', page: number = 0, size: number = 10): Observable<PagedHistoryDto> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filename.trim()) {
      params = params.set('filename', filename.trim());
    }

    return this.http.get<PagedHistoryDto>(`${this.baseUrl}/${STORE_BACKEND_ID[store]}/history`, { params });
  }

  getPdfUrl(pdfReference: string): string {
    return `${this.baseUrl}/pdf/${pdfReference}`;
  }

  deleteHistoryEntry(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/history/${id}`);
  }
}