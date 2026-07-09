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

import { AdminRegulationApiService } from '../services/admin-regulation-api.service';
import { IngestionJob, IngestionJobStatus } from '../models/ingestion-job.model';

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
  template: `
    <section class="page-shell history-page">
      <p-card header="Regulation Ingestion History">
        <p-table
          #dt
          [value]="jobs"
          [loading]="loading"
          [tableStyle]="{ 'min-width': '70rem' }"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [globalFilterFields]="['filename', 'strategy', 'status', 'errorMessage']"
          [sortOrder]="-1"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="caption">
            <div class="toolbar">
              <p-iconfield iconPosition="left" class="search-field">
                <p-inputicon styleClass="pi pi-search" />
                <input
                  pInputText
                  type="text"
                  placeholder="Search filename, strategy, error..."
                  (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                />
              </p-iconfield>

              <p-select
                [options]="statusOptions"
                [(ngModel)]="statusFilter"
                optionLabel="label"
                optionValue="value"
                placeholder="Filter by status"
                (onChange)="dt.filter($event.value, 'status', 'equals')"
                [showClear]="true"
              />

              <p-button
                label="Refresh"
                icon="pi pi-refresh"
                (onClick)="loadJobs()"
                [loading]="loading"
              />
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="filename">Filename <p-sortIcon field="filename" /></th>
              <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
              <th pSortableColumn="strategy">Strategy <p-sortIcon field="strategy" /></th>
              <th>Configs</th>
              <th pSortableColumn="chunkCount">Chunks <p-sortIcon field="chunkCount" /></th>

            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-job>
            <tr>
              <td>{{ job.filename || '-' }}</td>
              <td>
                <p-tag
                  [value]="job.status"
                  [severity]="getTagSeverity(job.status)"
                />
              </td>
              <td>{{ job.strategy }}</td>
              <td>{{ job.chunkConfig }}</td>
              <td>{{ job.chunkCount ?? '-' }}</td>

              <td class="error-cell">
                <span
                >
                </span>
                <ng-template #noError>-</ng-template>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="10">No ingestion jobs found.</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </section>
  `,
  styles: [
    `
      .history-page {
        display: grid;
        gap: 1.5rem;
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .search-field {
        flex: 1 1 260px;
        min-width: 220px;
      }

      .error-cell {
        max-width: 260px;
      }

      .error-text {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #b91c1c;
        cursor: default;
      }
    `,
  ],
})
export class AdminRegulationHistoryComponent implements OnInit {
  private readonly api = inject(AdminRegulationApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('dt') table!: Table;

  jobs: IngestionJob[] = [];
  loading = false;
  statusFilter: IngestionJobStatus | null = null;

  readonly statusOptions: StatusFilterOption[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Parsing', value: 'PARSING' },
    { label: 'Chunking', value: 'CHUNKING' },
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

  formatDate(value: string | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  }

  formatDuration(value: number | null): string {
    if (value === null || value === undefined) return '-';
    if (value < 1000) return `${value} ms`;
    return `${(value / 1000).toFixed(1)} s`;
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
}
