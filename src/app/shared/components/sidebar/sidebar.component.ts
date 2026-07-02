import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  open?: boolean;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  menuItems: MenuItem[] = [
    {
      label: 'Documents',
      icon: 'pi pi-file',
      open: false,
      children: [
        { label: 'Injection', route: '/admin/documents/injection' },
        { label: 'Historique', route: '/admin/documents/historique' }
      ]
    },
    { label: 'Recherche', icon: 'pi pi-search', route: '/admin/search' },
    { label: 'Benchmark', icon: 'pi pi-chart-bar', route: '/admin/benchmark' }
  ];

  toggle(item: MenuItem) {
    if (item.children) {
      item.open = !item.open;
    }
  }
}