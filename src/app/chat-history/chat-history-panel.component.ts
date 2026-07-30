import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';

import {
  ChatConversation,
  ChatMessage,
  ChatStreamEvent
} from '../models/chat.models';

import {
  ChatHistoryService
} from '../services/chat-history.service';

@Component({
  selector: 'app-chat-history-panel',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    TextareaModule,
    TagModule
  ],

  templateUrl:
    './chat-history-panel.component.html',

  styleUrl:
    './chat-history-panel.component.scss'
})
export class ChatHistoryPanelComponent
  implements OnInit, OnDestroy {

  @Input()
  reportId: number | null = null;

  @ViewChild('messagesContainer')
  messagesContainer?:
    ElementRef<HTMLDivElement>;

  conversations:
    ChatConversation[] = [];

  selectedConversationId:
    number | null = null;

  messages:
    ChatMessage[] = [];

  question = '';

  loadingConversations = false;
  loadingMessages = false;
  streaming = false;

  errorMessage = '';

  private abortController:
    AbortController | null = null;

  constructor(
    private readonly chatHistoryService:
      ChatHistoryService,

    private readonly cdr:
      ChangeDetectorRef
  ) {
  }

  async ngOnInit(): Promise<void> {
    await this.loadConversations();
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }

  async loadConversations(): Promise<void> {
    this.loadingConversations = true;
    this.errorMessage = '';

    try {
      this.conversations =
        await this.chatHistoryService
          .listConversations();

      if (
        this.conversations.length === 0
      ) {
        await this.createConversation();
        return;
      }

      const first =
        this.conversations[0];

      await this.openConversation(
        first.id
      );

    } catch (error) {
      this.errorMessage =
        this.getErrorMessage(error);

    } finally {
      this.loadingConversations = false;
      this.cdr.detectChanges();
    }
  }

  async createConversation():
    Promise<void> {

    try {
      const conversation =
        await this.chatHistoryService
          .createConversation();

      this.conversations = [
        conversation,
        ...this.conversations
      ];

      this.selectedConversationId =
        conversation.id;

      this.messages = [];
      this.errorMessage = '';

      this.cdr.detectChanges();

    } catch (error) {
      this.errorMessage =
        this.getErrorMessage(error);
    }
  }

  async openConversation(
    conversationId: number
  ): Promise<void> {

    if (this.streaming) {
      return;
    }

    this.selectedConversationId =
      conversationId;

    this.loadingMessages = true;
    this.errorMessage = '';

    try {
      const storedMessages =
        await this.chatHistoryService
          .getMessages(
            conversationId
          );

      this.messages =
        storedMessages.map(
          message => ({
            ...message,
            sources:
              message.sources ?? []
          })
        );

      this.scrollToBottom();

    } catch (error) {
      this.errorMessage =
        this.getErrorMessage(error);

    } finally {
      this.loadingMessages = false;
      this.cdr.detectChanges();
    }
  }

  async deleteConversation(
    conversationId: number,
    event: MouseEvent
  ): Promise<void> {

    event.stopPropagation();

    if (this.streaming) {
      return;
    }

    try {
      await this.chatHistoryService
        .deleteConversation(
          conversationId
        );

      this.conversations =
        this.conversations.filter(
          conversation =>
            conversation.id
            !== conversationId
        );

      if (
        this.selectedConversationId
        === conversationId
      ) {
        const next =
          this.conversations[0];

        if (next) {
          await this.openConversation(
            next.id
          );
        } else {
          await this.createConversation();
        }
      }

    } catch (error) {
      this.errorMessage =
        this.getErrorMessage(error);
    }
  }
  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();

    void this.sendQuestion();
  }

  async sendQuestion():
    Promise<void> {

    const text =
      this.question.trim();

    if (!text || this.streaming) {
      return;
    }

    if (
      this.selectedConversationId
      === null
    ) {
      await this.createConversation();
    }

    const conversationId =
      this.selectedConversationId;

    if (conversationId === null) {
      return;
    }

    const userMessage:
      ChatMessage = {

      id:
        `user-${Date.now()}`,

      role: 'USER',
      content: text,
      sources: [],

      createdAt:
        new Date().toISOString()
    };

    const assistantMessage:
      ChatMessage = {

      id:
        `assistant-${Date.now()}`,

      role: 'ASSISTANT',
      content: '',
      sources: [],
      pending: true,

      createdAt:
        new Date().toISOString()
    };

    this.messages = [
      ...this.messages,
      userMessage,
      assistantMessage
    ];

    this.question = '';
    this.streaming = true;
    this.errorMessage = '';

    this.abortController =
      new AbortController();

    this.scrollToBottom();
    this.cdr.detectChanges();

    try {
      await this.chatHistoryService
        .streamAnswer(
          conversationId,
          text,
          this.reportId,

          (event: ChatStreamEvent) => {
            this.handleStreamEvent(
              assistantMessage,
              event
            );
          },

          this.abortController.signal
        );

      assistantMessage.pending = false;

      await this.refreshConversationList();

    } catch (error) {
      assistantMessage.pending = false;

      if (
        error instanceof DOMException
        && error.name === 'AbortError'
      ) {
        assistantMessage.error =
          'Génération arrêtée.';
      } else {
        assistantMessage.error =
          this.getErrorMessage(error);
      }

    } finally {
      this.streaming = false;
      this.abortController = null;

      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  stopStreaming(): void {
    this.abortController?.abort();
  }

  private handleStreamEvent(
    assistantMessage:
      ChatMessage,

    event:
      ChatStreamEvent
  ): void {

    switch (event.type) {
      case 'sources':
        assistantMessage.sources =
          event.sources ?? [];
        break;

      case 'token':
        assistantMessage.pending = false;

        assistantMessage.content +=
          event.content ?? '';
        break;

      case 'completed':
        assistantMessage.pending = false;
        break;

      case 'error':
        assistantMessage.pending = false;

        assistantMessage.error =
          event.error
          ?? 'Erreur de génération.';
        break;
    }

    this.messages = [
      ...this.messages
    ];

    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  private async refreshConversationList():
    Promise<void> {

    this.conversations =
      await this.chatHistoryService
        .listConversations();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const element =
        this.messagesContainer
          ?.nativeElement;

      if (element) {
        element.scrollTop =
          element.scrollHeight;
      }
    });
  }

  private getErrorMessage(
    error: unknown
  ): string {

    if (error instanceof Error) {
      return error.message;
    }

    return 'Une erreur est survenue.';
  }
}
