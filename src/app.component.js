var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/ui/toast.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { filter } from 'rxjs/operators';
let AppComponent = class AppComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.router = inject(Router);
        // State
        this.isSidebarOpen = signal(true);
        this.isMobile = signal(false);
        effect(() => {
            const user = this.authService.currentUser();
            const isLoading = this.authService.isLoading();
            if (!user || isLoading)
                return;
            this.enforceRouteAccess();
        });
    }
    ngOnInit() {
        this.checkScreenSize();
        window.addEventListener('resize', this.onResize.bind(this));
        // Close sidebar on mobile when navigating
        this.routerSub = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            if (this.isMobile()) {
                this.isSidebarOpen.set(false);
            }
            this.enforceRouteAccess();
        });
    }
    ngOnDestroy() {
        window.removeEventListener('resize', this.onResize.bind(this));
        if (this.routerSub)
            this.routerSub.unsubscribe();
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
    enforceRouteAccess() {
        const currentUrl = this.router.url.startsWith('/#') ? this.router.url.slice(2) : this.router.url;
        const currentPath = currentUrl.split('?')[0] || '/dashboard';
        if (currentPath !== '/login' && !this.authService.canAccessPath(currentPath)) {
            void this.router.navigate([this.authService.getFirstAccessiblePath()]);
        }
    }
};
AppComponent = __decorate([
    Component({
        selector: 'app-root',
        standalone: true,
        imports: [CommonModule, RouterOutlet, ToastComponent, SidebarComponent],
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.css']
    })
], AppComponent);
export { AppComponent };
