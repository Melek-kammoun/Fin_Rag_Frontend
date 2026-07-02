import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IngestionResponseDto {
  success: boolean;
  durationMs: number;
  chunkCount: number;
  error: string;
}

export interface IngestionHistoryDto {
  id: number;
  filename: string;
  strategy: string;
  chunkCount: number;
  durationMs: number;
  success: boolean;
  error: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private baseUrl = 'http://localhost:8081/api/ingestion';

  constructor(private http: HttpClient) {}

  processDocument(store: string, file: File, strategy: string = 'RULE', chunkSize: number = 500, overlap: number = 100): Observable<IngestionResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('strategy', strategy);
    formData.append('chunkSize', chunkSize.toString());
    formData.append('overlap', overlap.toString());

    return this.http.post<IngestionResponseDto>(
      `${this.baseUrl}/${store}/process`,
      formData
    );
  }

  getHistory(store: string): Observable<IngestionHistoryDto[]> {
    return this.http.get<IngestionHistoryDto[]>(`${this.baseUrl}/${store}/history`);
  }
}