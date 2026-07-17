import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, startWith, switchMap, takeWhile } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { AdminRegulationApiService } from '../../services/admin-regulation-api.service';
import { IngestionJob } from '../../models/ingestion-job.model';

type StrategyOption = {
  label: string;
  value: string;
};

type IngestionStep = {
  key: 'PENDING' | 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'SAVING';
  label: string;
  description: string;
};

const INGESTION_STEPS: IngestionStep[] = [
  {
    key: 'PENDING',
    label: 'Queued',
    description: 'The ingestion job was created and is waiting to start.',
  },
  {
    key: 'PARSING',
    label: 'Parsing',
    description: 'The backend is reading and extracting the document content.',
  },
  {
    key: 'CHUNKING',
    label: 'Chunking',
    description: 'The extracted content is being split into searchable chunks.',
  },
  {
    key: 'EMBEDDING',
    label: 'Embedding',
    description: 'Each chunk is being transformed into vector embeddings.',
  },
  {
    key: 'SAVING',
    label: 'Storing',
    description: 'The vectors are being indexed and saved to fin-regulation.',
  },
];

@Component({
  selector: 'app-admin-regulation-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    FileUploadModule,
    InputNumberModule,
    MessageModule,
    ProgressBarModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './admin-regulation-upload.html',
  styleUrl: './admin-regulation-upload.css',
})
export class AdminRegulationUploadComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminRegulationApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'finrag-last-regulation-job-id';
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  selectedFile: File | null = null;
  strategy = 'RULE';
  chunkSize = 500;
  overlap = 100;
  submitting = false;
  errorMessage = '';
  currentJob: IngestionJob | null = null;

  private pollSubscription?: Subscription;

  readonly strategyOptions: StrategyOption[] = [
    { label: 'Rule', value: 'RULE' },
    { label: 'Size', value: 'SIZE' },
    { label: 'Block', value: 'BLOCK' },
    { label: 'Section', value: 'SECTION' },
    { label: 'LLM', value: 'LLM' },
  ];

  readonly steps: IngestionStep[] = INGESTION_STEPS;

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    const savedJobId = localStorage.getItem(this.storageKey);
    if (savedJobId) {
      this.startPolling(Number(savedJobId));
    }
  }

  onFileSelected(event: FileSelectEvent): void {
    this.selectedFile = event.currentFiles?.[0] ?? null;
    this.errorMessage = '';
  }

  onFileCleared(): void {
    this.selectedFile = null;
  }

  submit(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a PDF file first.';
      return;
    }

    this.errorMessage = '';
    this.submitting = true;
    this.currentJob = null;
    this.stopPolling();

    this.api
      .createJob({
        file: this.selectedFile,
        strategy: this.strategy,
        chunkSize: this.chunkSize,
        overlap: this.overlap,
      })
      .subscribe({
        next: (response) => {
          this.submitting = false;
          if (this.isBrowser) {
            localStorage.setItem(this.storageKey, String(response.jobId));
          }
          this.startPolling(response.jobId);
        },
        error: (error) => {
          this.submitting = false;
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Unable to start the ingestion job.';
        },
      });
  }

  startPolling(jobId: number): void {
    this.stopPolling();

    this.pollSubscription = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getJob(jobId)),
        takeWhile(
          (job) => job.status !== 'COMPLETED' && job.status !== 'FAILED',
          true
        )
      )
      .subscribe({
        next: (job) => {
          this.currentJob = job;

          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            this.stopPolling();
          }
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Unable to fetch job status.';
          this.stopPolling();
        },
      });
  }

  getTagSeverity(status: string):
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

  getPanelTitle(job: IngestionJob): string {
    if (job.status === 'COMPLETED') {
      return 'Ingestion completed';
    }
    if (job.status === 'FAILED') {
      return 'Ingestion failed';
    }
    return 'Ingestion in progress';
  }

  getStepLabel(status: IngestionJob['status']): string {
    const step = this.steps.find((s) => s.key === status);
    return step ? `${step.label} document` : '';
  }

  /** Index of the step matching the job's current status (0-based). COMPLETED = steps.length. */
  private getStepIndex(job: IngestionJob): number {
    if (job.status === 'COMPLETED') {
      return this.steps.length;
    }
    if (job.status === 'FAILED') {
      // Best-effort: approximate where the pipeline stopped from overall progress,
      // since the backend only reports the final FAILED status.
      return Math.min(
        this.steps.length - 1,
        Math.floor((job.progress / 100) * this.steps.length)
      );
    }
    const index = this.steps.findIndex((s) => s.key === job.status);
    return index === -1 ? 0 : index;
  }

  isStepDone(index: number, job: IngestionJob): boolean {
    return index < this.getStepIndex(job);
  }

  isStepCurrent(index: number, job: IngestionJob): boolean {
    return index === this.getStepIndex(job) && job.status !== 'COMPLETED';
  }

  isStepFailed(index: number, job: IngestionJob): boolean {
    return job.status === 'FAILED' && index === this.getStepIndex(job);
  }

  getStepDescription(step: IngestionStep, job: IngestionJob): string {
    if (
      job.chunkCount !== null &&
      (step.key === 'CHUNKING' || step.key === 'EMBEDDING' || step.key === 'SAVING') &&
      this.isStepDone(this.steps.findIndex((s) => s.key === step.key), job)
    ) {
      return `${step.description} (${job.chunkCount} chunks)`;
    }
    return step.description;
  }

  formatStrategy(strategy: string): string {
    if (!strategy) {
      return '';
    }
    return strategy.charAt(0).toUpperCase() + strategy.slice(1).toLowerCase();
  }

  private stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}


