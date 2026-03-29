var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, signal } from '@angular/core';
let BusinessStateService = class BusinessStateService {
    constructor() {
        this.selectedCategory = signal(null);
        this.searchQuery = signal('');
        this.typeFilter = signal('all');
        this.priceFilter = signal('all');
        this.sortBy = signal('newest');
        this.currentPage = signal(1);
        // Status filters
        this.isFeaturedFilter = signal(false);
        this.isVerifiedFilter = signal(false);
        this.isPremiumFilter = signal(false);
    }
};
BusinessStateService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], BusinessStateService);
export { BusinessStateService };
