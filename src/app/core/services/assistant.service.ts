import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SourceDto {
  filename: string;
  page: number;
  score: number;
}

export interface AssistantResponseDto {
  answer: string;
  sources: SourceDto[];
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {

  private baseUrl = 'http://localhost:8081/api/assistant';

  constructor(private http: HttpClient) {}

  askQuestion(question: string): Observable<AssistantResponseDto> {
    return this.http.post<AssistantResponseDto>(`${this.baseUrl}/ask`, { question });
  }
}
