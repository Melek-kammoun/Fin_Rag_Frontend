import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateIngestionJobResponse,
  CreateRegulationJobPayload,
  IngestionJob,
  ListJobsParams,
  PageResponse,
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
    if (payload.category) {
      formData.append('regulationCategory', payload.category);
    }

    return this.http.post<CreateIngestionJobResponse>(`${this.baseUrl}/jobs`, formData);
  }

  getJob(id: number): Observable<IngestionJob> {
    return this.http.get<IngestionJob>(`${this.baseUrl}/jobs/${id}`);
  }

  /** Server-side paginated + searchable + sortable ingestion history. */
  listJobs(params: ListJobsParams): Observable<PageResponse<IngestionJob>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('size', params.size)
      .set('sortField', params.sortField ?? 'startedAt')
      .set('sortOrder', params.sortOrder ?? 'desc');

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<PageResponse<IngestionJob>>(`${this.baseUrl}/jobs`, { params: httpParams });
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${id}`);
  }
}
