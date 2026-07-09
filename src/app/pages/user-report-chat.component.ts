import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, afterNextRender, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileUpload, FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AvatarModule } from 'primeng/avatar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';

import { UserReportApiService } from '../services/user-report-api.service';
import {
  AskQuestionResponse,
  ChatMessage,
  FinReport,
  ReportIngestionStatus,
  SourceCitation,
} from '../models/report-query.model';

type ReportOption = {
  label: string;
  value: number | null;
};

@Component({
  selector: 'app-user-report-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    FileUploadModule,
    MessageModule,
    SelectModule,
    TagModule,
    TextareaModule,
    AvatarModule,
    ProgressSpinnerModule,
    DividerModule,
  ],
  template: `
    <section class="page-shell reports-page">
      <p-card header="Upload a financial report" class="upload-card">
        <p class="page-intro">
          Upload a financial report and index it into <strong>fin-reports</strong>.
        </p>

        <div class="upload-row">
          <p-fileupload
            #fileUpload
            mode="basic"
            accept=".pdf"
            chooseLabel="Choose File"
            chooseIcon="pi pi-file-pdf"
            [auto]="false"
            [customUpload]="true"
            [maxFileSize]="52428800"
            (onSelect)="onFileSelected($event)"
            (onClear)="onFileCleared()"
          />

          <p-button
            label="Upload report"
            icon="pi pi-upload"
            [loading]="uploading"
            [disabled]="!selectedFile || uploading"
            (onClick)="uploadReport()"
          />
        </div>

        <small *ngIf="selectedFile" class="selected-file">
          Selected: {{ selectedFile.name }}
        </small>

        <p-message *ngIf="uploadError" severity="error" [text]="uploadError" styleClass="form-message" />
        <p-message
          *ngIf="uploadSuccessMessage"
          severity="success"
          [text]="uploadSuccessMessage"
          styleClass="form-message"
        />

        <p-divider *ngIf="reports.length" />

        <div class="reports-list" *ngIf="reports.length">
          <div class="reports-list-title">Indexed reports</div>
          <div class="report-row" *ngFor="let report of reports">
            <i class="pi pi-file-pdf"></i>
            <span class="report-filename">{{ report.filename }}</span>
            <p-tag [value]="report.status" [severity]="getTagSeverity(report.status)" />
            <span class="report-chunks" *ngIf="report.chunkCount !== null">
              {{ report.chunkCount }} chunks
            </span>
          </div>
        </div>
      </p-card>

      <p-card header="Ask a question" class="chat-card">
        <div class="scope-row">
          <label for="scope">Scope</label>
          <p-select
            inputId="scope"
            [options]="reportOptions"
            [(ngModel)]="selectedReportId"
            optionLabel="label"
            optionValue="value"
            placeholder="All reports"
            [fluid]="true"
          />
        </div>

        <div class="chat-window" #chatWindow>
          <div class="empty-state" *ngIf="!messages.length">
            <i class="pi pi-comments"></i>
            <p>Ask a question in natural language about your uploaded reports.</p>
          </div>

          <div
            class="chat-message"
            [class.user]="message.role === 'user'"
            [class.assistant]="message.role === 'assistant'"
            *ngFor="let message of messages"
          >
            <p-avatar
              [icon]="message.role === 'user' ? 'pi pi-user' : 'pi pi-sparkles'"
              shape="circle"
              [style]="message.role === 'user' ? { background: '#dbeafe', color: '#1d4ed8' } : { background: '#ede9fe', color: '#6d28d9' }"
            />

            <div class="bubble">
              <div class="bubble-content" *ngIf="!message.pending">{{ message.content }}</div>

              <div class="bubble-loading" *ngIf="message.pending">
                <p-progressSpinner styleClass="tiny-spinner" strokeWidth="6" />
                <span>Thinking…</span>
              </div>

              <p-message
                *ngIf="message.error"
                severity="error"
                [text]="message.error"
                styleClass="form-message"
              />

              <div class="sources" *ngIf="message.sources && message.sources.length">
                <div class="sources-title">Sources</div>
                <div class="source-item" *ngFor="let source of message.sources">
                  <i class="pi pi-file"></i>
                  <span class="source-filename">{{ source.filename }}</span>
                  <span class="source-page" *ngIf="source.page !== null">p.{{ source.page }}</span>
                  <p-tag
                    [value]="formatScore(source.score)"
                    [severity]="getScoreSeverity(source.score)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="ask-row">
          <textarea
            pTextarea
            [(ngModel)]="questionInput"
            rows="2"
            placeholder="e.g. What was the net income in Q4 2025?"
            [autoResize]="true"
            (keydown.enter)="onEnterKey($event)"
          ></textarea>

          <p-button
            icon="pi pi-send"
            [loading]="asking"
            [disabled]="!questionInput.trim() || asking"
            (onClick)="askQuestion()"
          />
        </div>
      </p-card>
    </section>
  `,
  styles: [
    `
      .reports-page {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
        gap: 1.5rem;
        align-items: start;
      }

      .page-intro {
        margin-top: 0;
        color: #4b5563;
      }

      .upload-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .selected-file {
        display: block;
        margin-top: 0.5rem;
        color: #4b5563;
      }

      .form-message {
        display: block;
        margin-top: 1rem;
        width: 100%;
      }

      .reports-list {
        display: grid;
        gap: 0.6rem;
      }

      .reports-list-title {
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.25rem;
      }

      .report-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.5rem 0.6rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        background: #fafafa;
      }

      .report-filename {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #1f2937;
      }

      .report-chunks {
        color: #6b7280;
        font-size: 0.85rem;
      }

      .scope-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .scope-row label {
        font-weight: 600;
        color: #374151;
        white-space: nowrap;
      }

      .chat-window {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-height: 320px;
        max-height: 480px;
        overflow-y: auto;
        padding: 0.25rem 0.25rem 0.5rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: #9ca3af;
        padding: 2.5rem 1rem;
        text-align: center;
      }

      .empty-state i {
        font-size: 1.75rem;
      }

      .chat-message {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
      }

      .chat-message.user {
        flex-direction: row-reverse;
      }

      .bubble {
        max-width: 75%;
        background: #f3f4f6;
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
      }

      .chat-message.user .bubble {
        background: #eff6ff;
      }

      .bubble-content {
        white-space: pre-wrap;
        color: #1f2937;
        line-height: 1.5;
      }

      .bubble-loading {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #6b7280;
      }

      .sources {
        margin-top: 0.75rem;
        border-top: 1px solid #e5e7eb;
        padding-top: 0.6rem;
        display: grid;
        gap: 0.4rem;
      }

      .sources-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .source-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #374151;
      }

      .source-filename {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .source-page {
        color: #6b7280;
      }

      .ask-row {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
        margin-top: 1rem;
      }

      .ask-row textarea {
        flex: 1;
      }

      @media (max-width: 900px) {
        .reports-page {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UserReportChatComponent implements OnInit {
  private readonly api = inject(UserReportApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('fileUpload') fileUpload?: FileUpload;
  @ViewChild('chatWindow') chatWindowRef?: ElementRef<HTMLDivElement>;

  selectedFile: File | null = null;
  uploading = false;
  uploadError = '';
  uploadSuccessMessage = '';

  reports: FinReport[] = [];
  selectedReportId: number | null = null;

  messages: ChatMessage[] = [];
  questionInput = '';
  asking = false;

  get reportOptions(): ReportOption[] {
    const completed = this.reports.filter((report) => report.status === 'COMPLETED');
    return [
      { label: 'All reports', value: null },
      ...completed.map((report) => ({ label: report.filename, value: report.id })),
    ];
  }

  constructor() {
    afterNextRender(() => this.loadReports());
  }

  ngOnInit(): void {}

  loadReports(): void {
    this.api.listReports().subscribe({
      next: (reports) => {
        this.reports = reports;
        this.cdr.markForCheck();
      },
      error: () => {
        // Non-blocking: the chat still works even if the report list fails to load.
        this.cdr.markForCheck();
      },
    });
  }

  onFileSelected(event: FileSelectEvent): void {
    this.selectedFile = event.currentFiles?.[0] ?? null;
    this.uploadError = '';
    this.uploadSuccessMessage = '';
  }

  onFileCleared(): void {
    this.selectedFile = null;
  }

  uploadReport(): void {
    if (!this.selectedFile) {
      this.uploadError = 'Please select a PDF file first.';
      return;
    }

    this.uploadError = '';
    this.uploadSuccessMessage = '';
    this.uploading = true;

    this.api.uploadReport(this.selectedFile).subscribe({
      next: (response) => {
        this.uploading = false;
        this.uploadSuccessMessage = `"${response.filename}" was submitted for indexing.`;
        this.selectedFile = null;
        this.fileUpload?.clear();
        this.loadReports();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.uploading = false;
        this.uploadError =
          (typeof error?.error === 'string' ? error.error : error?.error?.message) ||
          error?.message ||
          'Unable to upload the report.';
        this.cdr.markForCheck();
      },
    });
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }
    keyboardEvent.preventDefault();
    this.askQuestion();
  }

  askQuestion(): void {
    const question = this.questionInput.trim();
    if (!question || this.asking) {
      return;
    }

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };

    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: '',
      pending: true,
      createdAt: new Date().toISOString(),
    };

    this.messages = [...this.messages, userMessage, assistantMessage];
    this.questionInput = '';
    this.asking = true;
    this.scrollToBottom();
    this.cdr.markForCheck();

    this.api
      .ask({ question, reportId: this.selectedReportId })
      .subscribe({
        next: (response: AskQuestionResponse) => {
          assistantMessage.pending = false;
          assistantMessage.content = response.answer;
          assistantMessage.sources = response.sources;
          this.asking = false;
          this.scrollToBottom();
          this.cdr.markForCheck();
        },
        error: (error) => {
          assistantMessage.pending = false;
          assistantMessage.error =
            (typeof error?.error === 'string' ? error.error : error?.error?.message) ||
            error?.message ||
            'Unable to get an answer right now.';
          this.asking = false;
          this.scrollToBottom();
          this.cdr.markForCheck();
        },
      });
  }

  formatScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  getScoreSeverity(score: number): 'success' | 'warn' | 'danger' {
    if (score >= 0.8) return 'success';
    if (score >= 0.5) return 'warn';
    return 'danger';
  }

  getTagSeverity(
    status: ReportIngestionStatus
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'PENDING':
        return 'secondary';
      case 'PARSING':
      case 'CHUNKING':
      case 'SAVING':
        return 'info';
      default:
        return 'warn';
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const element = this.chatWindowRef?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }, 0);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
