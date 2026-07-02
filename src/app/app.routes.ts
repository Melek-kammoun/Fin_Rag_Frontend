import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './pages/admin-layout/admin-layout.component';
import { UserLayoutComponent } from './pages/user-layout/user-layout.component';
import { DocumentUploadComponent } from './features/documents/document-upload/document-upload.component';
import { DocumentHistoryComponent } from './features/documents/document-history/document-history.component';
import { AssistantComponent } from './features/assistant/assistant.component';

export const routes: Routes = [
  {
    path: 'user',
    component: UserLayoutComponent,
    children: [
      {
        path: 'documents',
        component: DocumentUploadComponent,
        data: {
          store: 'fin-reports',
          title: 'Ingestion de rapport financier',
          subtitle: 'Importez un fichier PDF pour lancer son traitement'
        }
      },
      { path: 'assistant', component: AssistantComponent },
      {
        path: 'historique',
        component: DocumentHistoryComponent,
        data: {
          store: 'fin-reports',
          subtitle: 'Suivi des rapports financiers traités'
        }
      },
      { path: '', redirectTo: 'documents', pathMatch: 'full' }
    ]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      {
        path: 'documents',
        children: [
          {
            path: 'injection',
            component: DocumentUploadComponent,
            data: {
              store: 'fin-regulation',
              title: 'Ingestion de document réglementaire',
              subtitle: 'Importez un fichier PDF pour lancer son traitement'
            }
          },
          {
            path: 'historique',
            component: DocumentHistoryComponent,
            data: {
              store: 'fin-regulation',
              subtitle: 'Suivi des documents traités pour fin-regulation'
            }
          },
          { path: '', redirectTo: 'injection', pathMatch: 'full' }
        ]
      },
      { path: '', redirectTo: 'documents', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'admin', pathMatch: 'full' }
];