import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, afterNextRender, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { CardModule } from 'primeng/card';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { AdminRegulationApiService } from '../../services/admin-regulation-api.service';
import { JobSocketService } from '../../services/job-socket.service';
import { IngestionJob, IngestionJobStatus } from '../../models/ingestion-job.model';

type StatusFilterOption = {
  label: string;
  value: IngestionJobStatus | null;
};

@Component({
  selector: 'app-admin-regulation-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
  ],
  templateUrl: './admin-regulation-history.html',
  styleUrl: './admin-regulation-history.css',
})
export class AdminRegulationHistoryComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminRegulationApiService);
  private readonly jobSocket = inject(JobSocketService);
  //forcer update
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('dt') table!: Table;

  jobs: IngestionJob[] = [];
  loading = false;
  statusFilter: IngestionJobStatus | null = null;
  searchTerm = '';
  totalRecords = 0;
  rows = 10;
  //id job
  deletingId: number | null = null;

  readonly statusOptions: StatusFilterOption[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Parsing', value: 'PARSING' },
    { label: 'Chunking', value: 'CHUNKING' },
    { label: 'Embedding', value: 'EMBEDDING' },
    { label: 'Saving', value: 'SAVING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Failed', value: 'FAILED' },
  ];

  /** Last lazy-load state reported by p-table, reused when search/status filters change. */
  private lastEvent: TableLazyLoadEvent = { first: 0, rows: this.rows };
  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private liveUpdatesSub?: Subscription;

  constructor() {
    afterNextRender(() => this.loadJobs(this.lastEvent));
  }

  ngOnInit(): void {
    // Debounce free-text search so we don't hit the backend on every keystroke.
    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      this.searchTerm = term;
      this.reloadFromFirstPage();
    });

    // Live updates: patch a row in place when its status changes (e.g. PARSING -> EMBEDDING)
    // without re-fetching the whole page, and without disturbing pagination/sort/search state.
    this.liveUpdatesSub = this.jobSocket.watchAllJobs().subscribe((updatedJob) => {
      const index = this.jobs.findIndex((j) => j.id === updatedJob.id);
      if (index === -1) {
        return;
      }
      this.jobs = [...this.jobs.slice(0, index), updatedJob, ...this.jobs.slice(index + 1)];
      this.cdr.markForCheck();
    });
  }

  onSearchInput(value: string): void {
    this.search$.next(value);
  }

  onStatusFilterChange(): void {
    this.reloadFromFirstPage();
  }

  private reloadFromFirstPage(): void {
    this.lastEvent = { ...this.lastEvent, first: 0 };
    if (this.table) {
      this.table.first = 0;
    }
    this.loadJobs(this.lastEvent);
  }

  /** Invoked by p-table (lazy mode) on page change, sort change, or initial render. */
  loadJobs(event: TableLazyLoadEvent): void {
    this.lastEvent = event;
    this.loading = true;

    const page = Math.floor((event.first ?? 0) / (event.rows ?? this.rows));
    const size = event.rows ?? this.rows;
    const sortField = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;

    this.api
      .listJobs({
        page,
        size,
        sortField: sortField ?? 'startedAt',
        sortOrder: event.sortOrder === 1 ? 'asc' : 'desc',
        search: this.searchTerm || undefined,
        status: this.statusFilter,
      })
      .subscribe({
        next: (result) => {
          this.jobs = result.content;
          this.totalRecords = result.totalElements;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  refresh(): void {
    this.loadJobs(this.lastEvent);
  }

  confirmDelete(job: IngestionJob): void {
    const confirmed = window.confirm(
      `Delete the ingestion job for "${job.filename}"? This removes the history entry only — it does not remove already-indexed vectors.`
    );
    if (!confirmed) {
      return;
    }
    this.deleteJob(job);
  }

  private deleteJob(job: IngestionJob): void {
    this.deletingId = job.id;

    this.api.deleteJob(job.id).subscribe({
      next: () => {
        this.deletingId = null;
        // Re-fetch the current page: deleting the last row of a page (or the
        // last row overall) can shift totals/paging, so a local splice isn't safe.
        this.loadJobs(this.lastEvent);
      },
      error: () => {
        this.deletingId = null;
        this.cdr.markForCheck();
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
      case 'EMBEDDING':
      case 'SAVING':
        return 'info';
      default:
        return 'warn';
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.liveUpdatesSub?.unsubscribe();
  }
}
