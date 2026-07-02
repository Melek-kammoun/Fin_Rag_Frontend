import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-sidebar.component.html',
  styleUrl: './user-sidebar.component.scss'
})
export class UserSidebarComponent {
  menuItems = [
    { label: 'Documents', icon: 'pi pi-file', route: '/user/documents' },
    { label: 'Assistant', icon: 'pi pi-comments', route: '/user/assistant' },
    { label: 'Historique', icon: 'pi pi-history', route: '/user/historique' }
  ];
}
