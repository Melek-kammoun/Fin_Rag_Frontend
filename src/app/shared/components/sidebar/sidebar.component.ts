import { Component } from '@angular/core';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [PanelMenuModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  menuItems: MenuItem[] = [
    {
      label: 'Documents',
      icon: 'pi pi-file',
      items: [
        { label: 'Injection', routerLink: '/admin/documents/injection' },
        { label: 'Historique', routerLink: '/admin/documents/historique' }
      ]
    },
    { label: 'Recherche', icon: 'pi pi-search', routerLink: '/admin/search' },
    { label: 'Benchmark', icon: 'pi pi-chart-bar', routerLink: '/admin/benchmark' }
  ];
}