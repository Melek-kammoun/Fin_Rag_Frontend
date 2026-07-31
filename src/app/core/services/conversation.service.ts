import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProcessJobStatusDto, PagedHistoryDto } from './document.service';

export type DocumentType = 'REPORT' | 'REGULATION';

export interface ConversationDto {
  id: number;
  title: string;
  sourceFile: string | null;
  documentType: DocumentType | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface IngestionJobStartedDto {
  jobId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConversationService {

  private baseUrl = 'http://localhost:8081/api/conversations';
  private ingestionUrl = 'http://localhost:8081/api/ingestion';

  constructor(private http: HttpClient) {}

  createConversation(title?: string): Observable<ConversationDto> {
    return this.http.post<ConversationDto>(this.baseUrl, title ? { title } : {});
  }

  getConversations(): Observable<ConversationDto[]> {
    return this.http.get<ConversationDto[]>(this.baseUrl);
  }

  getConversation(id: number): Observable<ConversationDto> {
    return this.http.get<ConversationDto>(`${this.baseUrl}/${id}`);
  }

  getMessages(id: number): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${this.baseUrl}/${id}/messages`);
  }

  attachFile(id: number, sourceFile: string): Observable<ConversationDto> {
    return this.http.post<ConversationDto>(`${this.baseUrl}/${id}/attach-file`, { sourceFile });
  }

  uploadFile(id: number, file: File): Observable<IngestionJobStartedDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<IngestionJobStartedDto>(`${this.baseUrl}/${id}/upload-file`, formData);
  }

  getUploadStatus(jobId: string): Observable<ProcessJobStatusDto> {
    return this.http.get<ProcessJobStatusDto>(`${this.ingestionUrl}/process/status/${jobId}`);
  }

  getAvailableReports(page: number = 0, size: number = 20): Observable<PagedHistoryDto> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedHistoryDto>(`${this.ingestionUrl}/FIN_REPORT/history`, { params });
  }

  deleteConversation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Streams an assistant reply token by token. The backend responds with
   * text/event-stream but isn't compatible with the native EventSource API
   * (POST + custom body), so the stream is read manually via fetch.
   */
  async streamMessage(
    conversationId: number,
    content: string,
    onToken: (token: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok || !response.body) {
      throw new Error('Erreur réseau lors de la génération.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          onToken(line.slice(5));
        }
      }
    }
  }
}
