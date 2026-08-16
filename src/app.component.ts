import { Component, inject, signal, OnInit, OnDestroy, effect, HostListener } from '@angular/core';
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
  private readonly onActionMenuToggle = (event: Event) => {
    const dropdown = event.target as HTMLDetailsElement;
    if (!dropdown.matches('details.table-action-menu')) return;
    if (dropdown.open) requestAnimationFrame(() => this.positionActionMenu(dropdown));
  };
  private readonly repositionActionMenus = () => {
    document.querySelectorAll<HTMLDetailsElement>('details.table-action-menu[open]')
      .forEach(dropdown => this.positionActionMenu(dropdown));
  };

  @HostListener('document:click', ['$event'])
  closeOpenDropdowns(event: MouseEvent) {
    const target = event.target as Node;
    const targetElement = target instanceof Element ? target : target.parentElement;
    const clickedActionItem = targetElement?.closest('.table-action-popover a, .table-action-popover button');
    document.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((dropdown) => {
      if (clickedActionItem || !dropdown.contains(target)) dropdown.removeAttribute('open');
    });
  }

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      const isLoading = this.authService.isLoading();
      if (!user || isLoading) return;
      this.enforceRouteAccess();
    });
  }

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', this.onResize.bind(this));
    document.addEventListener('toggle', this.onActionMenuToggle, true);
    document.addEventListener('scroll', this.repositionActionMenus, true);
    window.addEventListener('resize', this.repositionActionMenus);

    // Close sidebar on mobile when navigating
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile()) {
        this.isSidebarOpen.set(false);
      }
      if (this.authService.isLoading() || !this.authService.currentUser()) {
        return;
      }
      this.enforceRouteAccess();
    });
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    document.removeEventListener('toggle', this.onActionMenuToggle, true);
    document.removeEventListener('scroll', this.repositionActionMenus, true);
    window.removeEventListener('resize', this.repositionActionMenus);
    if (this.routerSub) this.routerSub.unsubscribe();
  }

  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize(): void{
    const wasMobile = this.isMobile();
    const isNowMobile = window.innerWidth < 768; // md breakpoint
    this.isMobile.set(isNowMobile);

    // Initial load logic: If switching to desktop, open. If switching to mobile, close.
    // Only adjust if the mode effectively changed to avoid annoying resets during slight resizes
    if (wasMobile !== isNowMobile) {
      this.isSidebarOpen.set(!isNowMobile); 
    }
  }

  toggleSidebar(): void{
    this.isSidebarOpen.update(v => !v);
  }

  private positionActionMenu(dropdown: HTMLDetailsElement): void {
    const trigger = dropdown.querySelector<HTMLElement>(':scope > summary');
    const menu = dropdown.querySelector<HTMLElement>(':scope > .table-action-popover');
    if (!trigger || !menu || !dropdown.open) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 176;
    const menuHeight = menu.offsetHeight;
    const viewportPadding = 8;
    const gap = 4;
    const left = Math.max(
      viewportPadding,
      Math.min(triggerRect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding)
    );
    const roomBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const openAbove = menuHeight > roomBelow && triggerRect.top - menuHeight - gap >= viewportPadding;
    const top = openAbove ? triggerRect.top - menuHeight - gap : triggerRect.bottom + gap;

    Object.assign(menu.style, {
      position: 'fixed',
      left: `${left}px`,
      right: 'auto',
      top: `${Math.max(viewportPadding, top)}px`,
      marginTop: '0',
      zIndex: '9999'
    });
  }

  private enforceRouteAccess(): void {
    const currentUrl = this.router.url.startsWith('/#') ? this.router.url.slice(2) : this.router.url;
    const currentPath = currentUrl.split('?')[0] || '/dashboard';

    if (currentPath === '/no-access' && this.authService.hasAccessiblePages()) {
      void this.router.navigate([this.authService.getFirstAccessiblePath()]);
      return;
    }

    if (currentPath !== '/login' && !this.authService.canAccessPath(currentPath)) {
      void this.authService.logout();
    }
  }
}
