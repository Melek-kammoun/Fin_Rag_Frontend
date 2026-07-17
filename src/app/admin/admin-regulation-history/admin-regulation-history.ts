import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, afterNextRender, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { AdminRegulationApiService } from '../../services/admin-regulation-api.service';
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
export class AdminRegulationHistoryComponent implements OnInit {
  private readonly api = inject(AdminRegulationApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('dt') table!: Table;

  jobs: IngestionJob[] = [];
  loading = false;
  statusFilter: IngestionJobStatus | null = null;
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

  constructor() {
    afterNextRender(() => this.loadJobs());
  }

  ngOnInit(): void {}

  loadJobs(): void {
    this.loading = true;

    this.api.listJobs().subscribe({
      next: (jobs) => {
        this.jobs = jobs;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
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
        this.jobs = this.jobs.filter((j) => j.id !== job.id);
        this.deletingId = null;
        this.cdr.markForCheck();
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
}
