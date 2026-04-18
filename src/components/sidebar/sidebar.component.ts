import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  host: {
    'class': 'bg-slate-900'
  },
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  authService = inject(AuthService);
  
  // Inputs
  isSidebarOpen = input<boolean>(true);
  isMobile = input<boolean>(false);
  
  // Outputs  
  logout = output<void>();
  
  currentUser = signal(this.authService.currentUser());
  

  navLinks = [
    { path: '/dashboard', label: 'Dashboard', matIcon: 'dashboard' },
    { path: '/users', label: 'Users', matIcon: 'people' },
    { path: '/businesses', label: 'Businesses', matIcon: 'store' },
    { path: '/jobs', label: 'Jobs', matIcon: 'work' },
    { path: '/banners', label: 'Banners', matIcon: 'campaign' },
    { path: '/offers', label: 'Latest Offers', matIcon: 'local_offer' },
    { path: '/events', label: 'Events', matIcon: 'event' },
    { path: '/news', label: 'News', matIcon: 'article' },
    { path: '/notifications', label: 'Notifications', matIcon: 'notifications' },
    { path: '/emails', label: 'Emails', matIcon: 'email' },
    { path: '/media', label: 'Media Library', matIcon: 'photo_library' },
    { path: '/settings', label: 'Settings', matIcon: 'settings' }
  ];

  
  onLogout() {
    this.logout.emit();
  }
}
