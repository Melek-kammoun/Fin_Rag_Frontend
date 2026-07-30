import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  ChatConversation,
  ChatMessage,
  ChatStreamEvent
} from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class ChatHistoryService {

  private readonly baseUrl =
    'http://localhost:8081/api/chat/conversations';

  constructor(
    private readonly http: HttpClient
  ) {
  }

  listConversations():
    Promise<ChatConversation[]> {

    return firstValueFrom(
      this.http.get<ChatConversation[]>(
        this.baseUrl
      )
    );
  }

  createConversation(
    title = 'Nouvelle conversation'
  ): Promise<ChatConversation> {

    return firstValueFrom(
      this.http.post<ChatConversation>(
        this.baseUrl,
        { title }
      )
    );
  }

  getMessages(
    conversationId: number
  ): Promise<ChatMessage[]> {

    return firstValueFrom(
      this.http.get<ChatMessage[]>(
        `${this.baseUrl}/${conversationId}/messages`
      )
    );
  }

  async deleteConversation(
    conversationId: number
  ): Promise<void> {

    await firstValueFrom(
      this.http.delete<void>(
        `${this.baseUrl}/${conversationId}`
      )
    );
  }

  async streamAnswer(
    conversationId: number,
    question: string,
    reportId: number | null,
    onEvent: (
      event: ChatStreamEvent
    ) => void,
    signal?: AbortSignal
  ): Promise<void> {

    const requestOptions: RequestInit = {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },

      body: JSON.stringify({
        question,
        reportId
      }),

      ...(signal ? { signal } : {})
    };

    const response = await window.fetch(
      `${this.baseUrl}/${conversationId}/ask/stream`,
      requestOptions
    );

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        body || `Erreur HTTP ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error(
        'Le serveur n’a retourné aucun flux SSE.'
      );
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder('utf-8');

    let buffer = '';

    while (true) {
      const result =
        await reader.read();

      if (result.done) {
        break;
      }

      buffer += decoder.decode(
        result.value,
        { stream: true }
      );

      buffer =
        buffer.replace(/\r\n/g, '\n');

      let separatorIndex =
        buffer.indexOf('\n\n');

      while (separatorIndex !== -1) {
        const rawEvent = buffer
          .slice(0, separatorIndex)
          .trim();

        buffer = buffer.slice(
          separatorIndex + 2
        );

        if (rawEvent) {
          this.parseEvent(
            rawEvent,
            onEvent
          );
        }

        separatorIndex =
          buffer.indexOf('\n\n');
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      this.parseEvent(
        buffer.trim(),
        onEvent
      );
    }
  }

  private parseEvent(
    rawEvent: string,
    onEvent: (event: ChatStreamEvent) => void
  ): void {
    const lines = rawEvent.split('\n');

    let eventName = '';

    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line
          .slice('event:'.length)
          .trim();
      }

      if (line.startsWith('data:')) {
        dataLines.push(
          line
            .slice('data:'.length)
            .trimStart()
        );
      }
    }

    if (dataLines.length === 0) {
      return;
    }

    const json = dataLines.join('\n');

    try {
      const event = JSON.parse(json) as ChatStreamEvent;

      if (!event.type && eventName) {
        event.type =
          eventName as ChatStreamEvent['type'];
      }

      onEvent(event);
    } catch (error) {
      console.error(
        'Événement SSE invalide :',
        json,
        error
      );
    }
  }}
