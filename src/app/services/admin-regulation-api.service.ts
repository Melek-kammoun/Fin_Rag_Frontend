import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateIngestionJobResponse,
  CreateRegulationJobPayload,
  IngestionJob,
} from '../models/ingestion-job.model';

@Injectable({
  providedIn: 'root',
})
export class AdminRegulationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8081/api/admin/regulations';

  createJob(payload: CreateRegulationJobPayload): Observable<CreateIngestionJobResponse> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('strategy', payload.strategy);
    formData.append('chunkSize', String(payload.chunkSize));
    formData.append('overlap', String(payload.overlap));

    return this.http.post<CreateIngestionJobResponse>(`${this.baseUrl}/jobs`, formData);
  }

  getJob(id: number): Observable<IngestionJob> {
    return this.http.get<IngestionJob>(`${this.baseUrl}/jobs/${id}`);
  }

  listJobs(): Observable<IngestionJob[]> {
    return this.http.get<IngestionJob[]>(`${this.baseUrl}/jobs`);
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${id}`);
  }
}
