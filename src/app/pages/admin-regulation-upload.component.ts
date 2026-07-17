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

  import { AdminRegulationApiService } from '../services/admin-regulation-api.service';
  import { IngestionJob } from '../models/ingestion-job.model';

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
    template: `
      <section class="upload-page">
        <div class="page-shell panel">
          <div class="panel-header">
            <div class="panel-icon"><i class="pi pi-shield"></i></div>
            <div>
              <h2>Regulation Ingestion</h2>
              <p class="page-intro">
                Upload a regulatory document and index it into <strong>fin-regulation</strong>
              </p>
            </div>
          </div>

          <div class="panel-body">
            <div class="form-grid">
              <div class="field field-file">
                <label for="file">Document</label>
                <p-fileupload
                  id="file"
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
                <small *ngIf="selectedFile" class="selected-file">
                  <i class="pi pi-check-circle"></i> {{ selectedFile.name }}
                </small>
              </div>

              <div class="field">
                <label for="strategy">Strategy</label>
                <p-select
                  inputId="strategy"
                  [options]="strategyOptions"
                  [(ngModel)]="strategy"
                  name="strategy"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select a strategy"
                  [fluid]="true"
                />
              </div>

              <div class="field">
                <label for="chunkSize">Chunk size</label>
                <p-inputNumber
                  inputId="chunkSize"
                  [(ngModel)]="chunkSize"
                  name="chunkSize"
                  [min]="100"
                  [max]="2000"
                  [showButtons]="true"
                  [fluid]="true"
                />
              </div>

              <div class="field">
                <label for="overlap">Overlap</label>
                <p-inputNumber
                  inputId="overlap"
                  [(ngModel)]="overlap"
                  name="overlap"
                  [min]="0"
                  [max]="500"
                  [showButtons]="true"
                  [fluid]="true"
                />
              </div>
            </div>

            <div class="actions">
              <p-button
                label="Start ingestion"
                icon="pi pi-upload"
                [loading]="submitting"
                [disabled]="!selectedFile || submitting"
                (onClick)="submit()"
              />
            </div>

            <p-message *ngIf="errorMessage" severity="error" [text]="errorMessage" styleClass="form-message" />
          </div>
        </div>

        <div class="page-shell panel" *ngIf="currentJob">
          <div class="panel-header">
            <div class="panel-icon"><i class="pi pi-chart-line"></i></div>
            <div>
              <h2>{{ getPanelTitle(currentJob) }}</h2>
              <p class="page-intro">Real-time ingestion pipeline</p>
            </div>
          </div>

          <div class="panel-body">
            <div class="job-summary">
              <div class="job-summary-main">
                <div class="job-current-step" *ngIf="currentJob.status !== 'COMPLETED' && currentJob.status !== 'FAILED'">
                  {{ getStepLabel(currentJob.status) }}
                </div>
                <div class="job-filename">
                  <i class="pi pi-file-pdf"></i>
                  {{ currentJob.filename }}
                </div>
                <div class="job-id">Job ID: {{ currentJob.id }}</div>
              </div>

              <p-tag
                [value]="currentJob.status"
                [severity]="getTagSeverity(currentJob.status)"
              />
            </div>

            <div class="meta-chips">
              <div class="meta-chip">
                <i class="pi pi-sitemap"></i>
                <span class="meta-chip-label">Strategy</span>
                <span class="meta-chip-value">{{ formatStrategy(currentJob.strategy) }}</span>
              </div>
              <div class="meta-chip">
                <i class="pi pi-align-justify"></i>
                <span class="meta-chip-label">Chunk size</span>
                <span class="meta-chip-value">{{ currentJob.chunkSize }}</span>
              </div>
              <div class="meta-chip">
                <i class="pi pi-arrows-h"></i>
                <span class="meta-chip-label">Overlap</span>
                <span class="meta-chip-value">{{ currentJob.overlap }}</span>
              </div>
              <div class="meta-chip">
                <i class="pi pi-database"></i>
                <span class="meta-chip-label">Store</span>
                <span class="meta-chip-value">{{ currentJob.store }}</span>
              </div>
            </div>

            <div class="step-tracker">
              <div
                class="step-card"
                *ngFor="let step of steps; let i = index"
                [class.step-done]="isStepDone(i, currentJob)"
                [class.step-current]="isStepCurrent(i, currentJob)"
                [class.step-failed]="isStepFailed(i, currentJob)"
              >
                <div class="step-circle">
                  <i class="pi pi-check" *ngIf="isStepDone(i, currentJob)"></i>
                  <i class="pi pi-times" *ngIf="isStepFailed(i, currentJob)"></i>
                  <i
                    class="pi pi-spin pi-spinner"
                    *ngIf="isStepCurrent(i, currentJob) && !isStepFailed(i, currentJob)"
                  ></i>
                  <span *ngIf="!isStepDone(i, currentJob) && !isStepCurrent(i, currentJob) && !isStepFailed(i, currentJob)">
                    {{ i + 1 }}
                  </span>
                </div>
                <div class="step-text">
                  <div class="step-title">{{ step.label }}</div>
                  <div class="step-desc">{{ getStepDescription(step, currentJob) }}</div>
                </div>
              </div>
            </div>

            <div class="progress-block" *ngIf="currentJob.status !== 'COMPLETED' && currentJob.status !== 'FAILED'">
              <p-progressBar [value]="currentJob.progress"></p-progressBar>
              <div class="progress-meta">
                <span class="progress-value">{{ currentJob.progress }}%</span>
                <span *ngIf="currentJob.chunkCount !== null" class="chunk-badge">
                  <i class="pi pi-th-large"></i> {{ currentJob.chunkCount }} chunks generated
                </span>
              </div>
            </div>

            <p-message
              *ngIf="currentJob.status === 'COMPLETED'"
              severity="success"
              [text]="'Ingestion completed successfully' + (currentJob.chunkCount !== null ? ' — ' + currentJob.chunkCount + ' chunks generated.' : '.')"
              styleClass="form-message"
            />

            <p-message
              *ngIf="currentJob.status === 'FAILED'"
              severity="error"
              styleClass="form-message"
            />
          </div>
        </div>
      </section>
    `,
    styles: [
      `
        .upload-page {
          display: grid;
          gap: 1.5rem;
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          padding: 1.35rem 1.5rem;
          border-bottom: 1px solid var(--frg-navy-400, #1c2f4d);
          background: linear-gradient(90deg, rgba(214, 185, 75, 0.06), transparent 60%);
        }

        .panel-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--frg-gold-300, #e8cd7a);
          background: rgba(214, 185, 75, 0.1);
          border: 1px solid rgba(214, 185, 75, 0.3);
          font-size: 1.05rem;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--frg-text-primary, #eef1f6);
          letter-spacing: 0.01em;
        }

        .page-intro {
          margin: 0.2rem 0 0;
          color: var(--frg-text-secondary, #9aa8c0);
          font-size: 0.88rem;
        }

        .page-intro strong {
          color: var(--frg-gold-300, #e8cd7a);
          font-weight: 600;
        }

        .panel-body {
          padding: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .field-file {
          grid-column: 1 / -1;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field label {
          font-weight: 600;
          font-size: 0.82rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--frg-text-secondary, #9aa8c0);
        }

        .selected-file {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--frg-success, #3fae82);
          font-size: 0.85rem;
        }

        .actions {
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--frg-navy-400, #1c2f4d);
        }

        .job-summary {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .job-current-step {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--frg-gold-300, #e8cd7a);
          margin-bottom: 0.35rem;
        }

        .job-filename {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--frg-text-primary, #eef1f6);
          word-break: break-word;
        }

        .job-filename i {
          color: var(--frg-gold-400, #d6b94b);
          font-size: 0.95rem;
          flex-shrink: 0;
        }

        .job-id {
          margin-top: 0.3rem;
          color: var(--frg-text-muted, #64738f);
          font-size: 0.8rem;
          font-family: 'SFMono-Regular', Consolas, monospace;
        }

        .step-tracker {
          display: grid;
          gap: 0.6rem;
          margin-bottom: 1.5rem;
        }

        .step-card {
          display: flex;
          align-items: flex-start;
          gap: 0.9rem;
          padding: 0.9rem 1.1rem;
          border-radius: 0.7rem;
          border: 1px solid var(--frg-navy-400, #1c2f4d);
          background: rgba(255, 255, 255, 0.015);
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .step-card.step-done {
          background: rgba(63, 174, 130, 0.07);
          border-color: rgba(63, 174, 130, 0.3);
        }

        .step-card.step-current {
          background: rgba(214, 185, 75, 0.09);
          border-color: rgba(214, 185, 75, 0.4);
          box-shadow: 0 0 0 1px rgba(214, 185, 75, 0.12);
        }

        .step-card.step-failed {
          background: rgba(226, 106, 106, 0.08);
          border-color: rgba(226, 106, 106, 0.4);
        }

        .step-circle {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          border: 1px solid var(--frg-navy-300, #233a5c);
          color: var(--frg-text-muted, #64738f);
          background: rgba(255, 255, 255, 0.02);
        }

        .step-done .step-circle {
          background: var(--frg-success, #3fae82);
          border-color: var(--frg-success, #3fae82);
          color: #06251a;
        }

        .step-current .step-circle {
          background: var(--frg-gold-400, #d6b94b);
          border-color: var(--frg-gold-400, #d6b94b);
          color: var(--frg-navy-900, #040810);
        }

        .step-failed .step-circle {
          background: var(--frg-danger, #e26a6a);
          border-color: var(--frg-danger, #e26a6a);
          color: #2b0c0c;
        }

        .step-text {
          padding-top: 0.05rem;
        }

        .step-title {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--frg-text-primary, #eef1f6);
        }

        .step-desc {
          margin-top: 0.15rem;
          font-size: 0.82rem;
          color: var(--frg-text-secondary, #9aa8c0);
        }

        .meta-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin-bottom: 1.5rem;
        }

        .meta-chip {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--frg-navy-400, #1c2f4d);
          font-size: 0.82rem;
        }

        .meta-chip i {
          color: var(--frg-gold-400, #d6b94b);
          font-size: 0.85rem;
        }

        .meta-chip-label {
          color: var(--frg-text-muted, #64738f);
          text-transform: uppercase;
          font-size: 0.68rem;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        .meta-chip-value {
          color: var(--frg-text-primary, #eef1f6);
          font-weight: 600;
        }

        .progress-block {
          display: grid;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .progress-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--frg-text-secondary, #9aa8c0);
          font-size: 0.9rem;
        }

        .progress-value {
          color: var(--frg-gold-300, #e8cd7a);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .chunk-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          background: rgba(214, 185, 75, 0.1);
          border: 1px solid rgba(214, 185, 75, 0.25);
          color: var(--frg-gold-300, #e8cd7a);
          font-size: 0.8rem;
        }

        .form-message {
          display: block;
          margin-top: 1.25rem;
          width: 100%;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .job-summary {
            flex-direction: column;
            align-items: flex-start;
          }

          .meta-chips {
            gap: 0.5rem;
          }
        }
      `,
    ],
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
