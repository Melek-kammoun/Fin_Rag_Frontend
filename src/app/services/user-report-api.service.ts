import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AskQuestionRequest,
  AskQuestionResponse,
  FinReport,
  UploadReportResponse,
} from '../models/report-query.model';

@Injectable({
  providedIn: 'root',
})
export class UserReportApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8081/api/reports';

  uploadReport(file: File): Observable<UploadReportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadReportResponse>(`${this.baseUrl}/upload`, formData);
  }

  listReports(): Observable<FinReport[]> {
    return this.http.get<FinReport[]>(this.baseUrl);
  }

  ask(payload: AskQuestionRequest): Observable<AskQuestionResponse> {
    return this.http.post<AskQuestionResponse>(`${this.baseUrl}/ask`, payload);
  }
}
