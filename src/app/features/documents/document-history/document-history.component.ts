import { Component, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DocumentService, IngestionHistoryDto } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule
  ],
  providers: [ConfirmationService],
  templateUrl: './document-history.component.html',
  styleUrl: './document-history.component.scss'
})
export class DocumentHistoryComponent implements OnDestroy {
  private documentService = inject(DocumentService);
  private sanitizer = inject(DomSanitizer);
  private confirmationService = inject(ConfirmationService);

  @Input() store = 'fin-regulation';
  @Input() subtitle = 'Suivi des documents traités pour fin-regulation';

  history: IngestionHistoryDto[] = [];
  loading = true;

  filename = '';
  page = 0;
  size = 10;
  totalElements = 0;

  pdfDialogVisible = false;
  pdfUrl: SafeResourceUrl | null = null;

  private search$ = new Subject<string>();
  private searchSubscription: Subscription;

  constructor() {
    this.searchSubscription = this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => {
        this.filename = value;
        this.page = 0;
        this.loadHistory();
      });
  }

  ngOnDestroy() {
    this.searchSubscription.unsubscribe();
  }

  onSearchInput(value: string) {
    this.search$.next(value);
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    const rows = event.rows ?? this.size;
    this.size = rows;
    this.page = Math.floor((event.first ?? 0) / rows);
    this.loadHistory();
  }

  private loadHistory() {
    this.loading = true;
    this.documentService.getHistory(this.store, this.filename, this.page, this.size).subscribe({
      next: (res) => {
        this.history = res.content;
        this.totalElements = res.totalElements;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  viewPdf(item: IngestionHistoryDto) {
    if (!item.pdfReference) return;
    const url = this.documentService.getPdfUrl(item.pdfReference);
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.pdfDialogVisible = true;
  }

  confirmDelete(item: IngestionHistoryDto) {
    this.confirmationService.confirm({
      message: `Supprimer définitivement "${item.filename}" et ses chunks associés ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteEntry(item)
    });
  }

  private deleteEntry(item: IngestionHistoryDto) {
    this.documentService.deleteHistoryEntry(item.id).subscribe({
      next: () => this.loadHistory()
    });
  }
}
