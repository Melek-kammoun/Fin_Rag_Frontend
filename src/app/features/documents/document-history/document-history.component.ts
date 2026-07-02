import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DocumentService, IngestionHistoryDto } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-history',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule],
  templateUrl: './document-history.component.html',
  styleUrl: './document-history.component.scss'
})
export class DocumentHistoryComponent implements OnInit {
  private documentService = inject(DocumentService);

  @Input() store = 'fin-regulation';
  @Input() subtitle = 'Suivi des documents traités pour fin-regulation';

  history: IngestionHistoryDto[] = [];
  loading = true;

  ngOnInit() {
    this.documentService.getHistory(this.store).subscribe({
      next: (data) => {
        this.history = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
