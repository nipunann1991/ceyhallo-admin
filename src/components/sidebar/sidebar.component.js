var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
let SidebarComponent = class SidebarComponent {
    constructor() {
        this.authService = inject(AuthService);
        // Inputs
        this.isSidebarOpen = input(true);
        this.isMobile = input(false);
        // Outputs  
        this.logout = output();
        this.currentUser = signal(this.authService.currentUser());
        this.navLinks = [
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
    }
    onLogout() {
        this.logout.emit();
    }
};
SidebarComponent = __decorate([
    Component({
        selector: 'app-sidebar',
        host: {
            'class': 'bg-slate-900'
        },
        standalone: true,
        imports: [CommonModule, RouterLink, RouterLinkActive],
        templateUrl: './sidebar.component.html',
        styleUrls: ['./sidebar.component.css']
    })
], SidebarComponent);
export { SidebarComponent };
