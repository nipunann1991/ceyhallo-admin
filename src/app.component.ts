import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/ui/toast.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastComponent, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private router: Router = inject(Router);
  
  // State
  isSidebarOpen = signal(true);
  isMobile = signal(false);
  
  private routerSub!: Subscription;

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', this.onResize.bind(this));

    // Close sidebar on mobile when navigating
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile()) {
        this.isSidebarOpen.set(false);
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.routerSub) this.routerSub.unsubscribe();
  }

  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    const wasMobile = this.isMobile();
    const isNowMobile = window.innerWidth < 768; // md breakpoint
    this.isMobile.set(isNowMobile);

    // Initial load logic: If switching to desktop, open. If switching to mobile, close.
    // Only adjust if the mode effectively changed to avoid annoying resets during slight resizes
    if (wasMobile !== isNowMobile) {
      this.isSidebarOpen.set(!isNowMobile); 
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }
}

