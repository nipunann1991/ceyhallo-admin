var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
let ExcludedCategoriesService = class ExcludedCategoriesService {
    constructor() {
        this.firebaseService = inject(FirebaseService);
        this.authService = inject(AuthService);
        this.excludedCategories = signal([]);
        this.SETTINGS_COLLECTION = 'settings';
        this.EXCLUDED_CATEGORIES_DOC_ID = 'excludedCategories';
        this.listenToExcludedCategories();
    }
    listenToExcludedCategories() {
        this.firebaseService.listenToDocument(this.SETTINGS_COLLECTION, this.EXCLUDED_CATEGORIES_DOC_ID, (data) => {
            if (data === null) {
                // Document doesn't exist, so create it with an empty array
                this.firebaseService.set(`${this.SETTINGS_COLLECTION}/${this.EXCLUDED_CATEGORIES_DOC_ID}`, { categoryIds: [] });
                this.excludedCategories.set([]);
            }
            else {
                this.excludedCategories.set(data?.categoryIds || []);
            }
        });
    }
    toggleCategoryExclusion(categoryId) {
        const current = this.excludedCategories();
        let updated;
        if (current.includes(categoryId)) {
            updated = current.filter(id => id !== categoryId);
        }
        else {
            updated = [...current, categoryId];
        }
        this.updateExcludedCategoriesInDb(updated);
    }
    async updateExcludedCategoriesInDb(categoryIds) {
        try {
            await this.firebaseService.set(`${this.SETTINGS_COLLECTION}/${this.EXCLUDED_CATEGORIES_DOC_ID}`, { categoryIds });
        }
        catch (e) {
            console.error('Failed to update excluded categories in DB:', e);
            // Optionally, revert local state or show a toast
        }
    }
};
ExcludedCategoriesService = __decorate([
    Injectable({ providedIn: 'root' })
], ExcludedCategoriesService);
export { ExcludedCategoriesService };
