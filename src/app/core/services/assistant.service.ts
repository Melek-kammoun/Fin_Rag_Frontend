import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {

  private baseUrl = 'http://localhost:8081/api/search';

  constructor(private http: HttpClient) {}

  askQuestion(question: string, topK: number = 10): Observable<string> {
    const params = new HttpParams()
      .set('query', question)
      .set('topK', topK);

    return this.http.post(`${this.baseUrl}/ask`, null, { params, responseType: 'text' });
  }
}
