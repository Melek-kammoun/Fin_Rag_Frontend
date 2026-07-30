import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import {
  FileSelectEvent,
  FileUpload,
  FileUploadModule,
} from 'primeng/fileupload';

import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import { UserReportApiService } from '../services/user-report-api.service';

import {
  FinReport,
  ReportIngestionStatus,
} from '../models/report-query.model';

import {
  ChatHistoryPanelComponent,
} from '../chat-history/chat-history-panel.component';

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
    DividerModule,
    ChatHistoryPanelComponent,
  ],

  template: `
    <section class="page-shell reports-page">

      <!-- ================================
           PARTIE RAPPORTS
           ================================ -->

      <p-card
        header="Upload a financial report"
        class="upload-card"
      >
        <p class="page-intro">
          Upload a financial report and index it into
          <strong>fin-reports</strong>.
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

        <small
          *ngIf="selectedFile"
          class="selected-file"
        >
          Selected: {{ selectedFile.name }}
        </small>

        <p-message
          *ngIf="uploadError"
          severity="error"
          [text]="uploadError"
          styleClass="form-message"
        />

        <p-message
          *ngIf="uploadSuccessMessage"
          severity="success"
          [text]="uploadSuccessMessage"
          styleClass="form-message"
        />

        <p-divider *ngIf="reports.length" />

        <div
          class="reports-list"
          *ngIf="reports.length"
        >
          <div class="reports-list-title">
            Indexed reports
          </div>

          <div
            class="report-row"
            *ngFor="let report of reports"
          >
            <i class="pi pi-file-pdf"></i>

            <span class="report-filename">
              {{ report.filename }}
            </span>

            <p-tag
              [value]="report.status"
              [severity]="getTagSeverity(report.status)"
            />

            <span
              class="report-chunks"
              *ngIf="report.chunkCount !== null"
            >
              {{ report.chunkCount }} chunks
            </span>
          </div>
        </div>
      </p-card>

      <!-- ================================
           PARTIE CHAT + HISTORIQUE + SSE
           ================================ -->

      <p-card
        header="Chat avec historique"
        class="chat-card"
      >
        <div class="scope-row">

          <label for="scope">
            Scope
          </label>

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

        <app-chat-history-panel
          [reportId]="selectedReportId"
        />

      </p-card>

    </section>
  `,

  styles: [
    `
      .reports-page {
        display: grid;
        grid-template-columns:
          minmax(320px, 0.8fr)
          minmax(0, 1.8fr);

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
        width: 100%;
        margin-top: 1rem;
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
        min-width: 0;

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        color: #1f2937;
      }

      .report-chunks {
        color: #6b7280;
        font-size: 0.85rem;
        white-space: nowrap;
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

      .scope-row p-select {
        flex: 1;
      }

      :host ::ng-deep .chat-card .p-card-body {
        padding: 1rem;
      }

      :host ::ng-deep .chat-card .p-card-content {
        padding: 0;
      }

      @media (max-width: 1100px) {
        .reports-page {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UserReportChatComponent implements OnInit {

  private readonly api =
    inject(UserReportApiService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  @ViewChild('fileUpload')
  fileUpload?: FileUpload;

  selectedFile: File | null = null;

  uploading = false;

  uploadError = '';

  uploadSuccessMessage = '';

  reports: FinReport[] = [];

  selectedReportId: number | null = null;

  get reportOptions(): ReportOption[] {
    const completed =
      this.reports.filter(
        report =>
          report.status === 'COMPLETED'
      );

    return [
      {
        label: 'All reports',
        value: null,
      },

      ...completed.map(
        report => ({
          label: report.filename,
          value: report.id,
        })
      ),
    ];
  }

  constructor() {
    afterNextRender(() => {
      this.loadReports();
    });
  }

  ngOnInit(): void {
  }

  loadReports(): void {
    this.api.listReports().subscribe({
      next: reports => {
        this.reports = reports;
        this.cdr.markForCheck();
      },

      error: error => {
        console.error(
          'Unable to load reports:',
          error
        );

        this.cdr.markForCheck();
      },
    });
  }

  onFileSelected(
    event: FileSelectEvent
  ): void {
    this.selectedFile =
      event.currentFiles?.[0] ?? null;

    this.uploadError = '';
    this.uploadSuccessMessage = '';
  }

  onFileCleared(): void {
    this.selectedFile = null;
  }

  uploadReport(): void {
    if (!this.selectedFile) {
      this.uploadError =
        'Please select a PDF file first.';

      return;
    }

    this.uploadError = '';
    this.uploadSuccessMessage = '';
    this.uploading = true;

    this.api
      .uploadReport(this.selectedFile)
      .subscribe({
        next: response => {
          this.uploading = false;

          this.uploadSuccessMessage =
            `"${response.filename}" was submitted for indexing.`;

          this.selectedFile = null;

          this.fileUpload?.clear();

          this.loadReports();

          this.cdr.markForCheck();
        },

        error: error => {
          this.uploading = false;

          this.uploadError =
            (
              typeof error?.error === 'string'
                ? error.error
                : error?.error?.message
            )
            || error?.message
            || 'Unable to upload the report.';

          this.cdr.markForCheck();
        },
      });
  }

  getTagSeverity(
    status: ReportIngestionStatus
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'secondary'
    | 'contrast' {

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
}
