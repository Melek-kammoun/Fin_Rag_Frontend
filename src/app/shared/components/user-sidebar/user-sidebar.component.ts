import { Component } from '@angular/core';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-user-sidebar',
  standalone: true,
  imports: [PanelMenuModule],
  templateUrl: './user-sidebar.component.html',
  styleUrl: './user-sidebar.component.scss'
})
export class UserSidebarComponent {
  menuItems: MenuItem[] = [
    { label: 'Documents', icon: 'pi pi-file', routerLink: '/user/documents' },
    { label: 'Assistant', icon: 'pi pi-comments', routerLink: '/user/assistant' },
    { label: 'Historique', icon: 'pi pi-history', routerLink: '/user/historique' }
  ];
}
