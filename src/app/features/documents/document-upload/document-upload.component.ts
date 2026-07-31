import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DocumentService, IngestionResponseDto, IngestionJobStatus } from '../../../core/services/document.service';

const STEP_PROGRESS: Record<IngestionJobStatus, number> = {
  PENDING: 5,
  PARSING: 30,
  CHUNKING: 60,
  EMBEDDING: 85,
  DONE: 100,
  FAILED: 100
};

const POLL_INTERVAL_MS = 1500;

const PIPELINE_STEPS: { status: IngestionJobStatus; label: string; icon: string }[] = [
  { status: 'PENDING', label: 'PENDING', icon: 'pi-upload' },
  { status: 'PARSING', label: 'PARSING', icon: 'pi-file-edit' },
  { status: 'CHUNKING', label: 'CHUNKING', icon: 'pi-th-large' },
  { status: 'EMBEDDING', label: 'EMBEDDING', icon: 'pi-sitemap' },
  { status: 'DONE', label: 'DONE', icon: 'pi-check-circle' }
];

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [
    CommonModule,
    FileUploadModule,
    ButtonModule,
    MessageModule,
    ProgressBarModule
  ],
  templateUrl: './document-upload.component.html',
  styleUrl: './document-upload.component.scss'
})
export class DocumentUploadComponent implements OnDestroy {

  @Input() store = 'fin-regulation';
  @Input() title = 'Ingestion de document réglementaire';
  @Input() subtitle = 'Importez un fichier PDF pour lancer son traitement';

  selectedFile: File | null = null;
  loading = false;
  response: IngestionResponseDto | null = null;
  errorMessage: string | null = null;

  jobStatus: IngestionJobStatus | null = null;
  statusMessage: string | null = null;
  progress = 0;

  steps = PIPELINE_STEPS;

  private pollSubscription?: Subscription;

  constructor(private documentService: DocumentService) {}

  onFileSelect(event: any) {
    this.selectedFile = event.files[0];
    this.response = null;
    this.errorMessage = null;
  }

  stepState(step: IngestionJobStatus): 'done' | 'active' | 'pending' {
    if (!this.jobStatus) return 'pending';
    const order = this.steps.map((s) => s.status);
    const currentIndex = order.indexOf(this.jobStatus === 'FAILED' ? 'EMBEDDING' : this.jobStatus);
    const stepIndex = order.indexOf(step);
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return this.jobStatus === 'DONE' ? 'done' : 'active';
    return 'pending';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  upload() {
    if (!this.selectedFile) return;

    this.pollSubscription?.unsubscribe();

    this.loading = true;
    this.response = null;
    this.errorMessage = null;
    this.jobStatus = 'PENDING';
    this.statusMessage = 'En attente de traitement';
    this.progress = STEP_PROGRESS.PENDING;

    this.documentService.processDocument(this.store, this.selectedFile).subscribe({
      next: (job) => this.pollStatus(job.jobId),
      error: () => {
        this.errorMessage = 'Erreur lors du lancement de l\'ingestion.';
        this.loading = false;
      }
    });
  }

  private pollStatus(jobId: string) {
    this.pollSubscription = interval(POLL_INTERVAL_MS)
      .pipe(switchMap(() => this.documentService.getProcessStatus(jobId)))
      .subscribe({
        next: (status) => {
          this.jobStatus = status.status;
          this.statusMessage = status.message;
          this.progress = STEP_PROGRESS[status.status];

          if (status.status === 'DONE') {
            this.response = status.result;
            this.loading = false;
            this.pollSubscription?.unsubscribe();
          } else if (status.status === 'FAILED') {
            this.errorMessage = status.result?.error || status.message;
            this.loading = false;
            this.pollSubscription?.unsubscribe();
          }
        },
        error: () => {
          this.errorMessage = 'Erreur lors du suivi de l\'ingestion.';
          this.loading = false;
          this.pollSubscription?.unsubscribe();
        }
      });
  }

  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
  }
}