import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DocumentService, IngestionResponseDto } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [
    CommonModule,
    FileUploadModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule
  ],
  templateUrl: './document-upload.component.html',
  styleUrl: './document-upload.component.scss'
})
export class DocumentUploadComponent {

  @Input() store = 'fin-regulation';
  @Input() title = 'Ingestion de document réglementaire';
  @Input() subtitle = 'Importez un fichier PDF pour lancer son traitement';

  selectedFile: File | null = null;
  loading = false;
  response: IngestionResponseDto | null = null;
  errorMessage: string | null = null;

  constructor(private documentService: DocumentService) {}

  onFileSelect(event: any) {
    this.selectedFile = event.files[0];
    this.response = null;
    this.errorMessage = null;
  }

  upload() {
    if (!this.selectedFile) return;

    this.loading = true;
    this.response = null;
    this.errorMessage = null;

    this.documentService.processDocument(this.store, this.selectedFile).subscribe({
      next: (res) => {
        this.response = res;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de l\'ingestion.';
        this.loading = false;
      }
    });
  }
}