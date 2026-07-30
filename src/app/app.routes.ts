import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin/regulations/upload',
  },
  {
    path: 'admin/regulations/upload',
    loadComponent: () =>
      import('./admin/admin-regulation-upload/admin-regulation-upload').then(
        (m) => m.AdminRegulationUploadComponent
      ),
  },
  {
    path: 'admin/regulations/history',
    loadComponent: () =>
      import('./admin/admin-regulation-history/admin-regulation-history').then(
        (m) => m.AdminRegulationHistoryComponent
      ),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./pages/user-report-chat.component').then(
        (m) => m.UserReportChatComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'admin/regulations/upload',
  },
];
