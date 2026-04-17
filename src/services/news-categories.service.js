var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';
let NewsCategoriesService = class NewsCategoriesService {
    constructor() {
        this.firebaseService = inject(FirebaseService);
        this.settingsCollection = 'settings';
        this.docId = 'news_categories';
        this.categories = signal([]);
        this.listenToCategories();
    }
    async addCategory(name, slug) {
        const normalizedName = this.normalizeName(name);
        const normalizedSlug = this.normalizeSlug(slug || normalizedName);
        if (!normalizedName) {
            throw new Error('Category name is required.');
        }
        if (!normalizedSlug) {
            throw new Error('Category slug is required.');
        }
        if (this.hasDuplicateName(normalizedName)) {
            throw new Error('Category already exists.');
        }
        if (this.hasDuplicateSlug(normalizedSlug)) {
            throw new Error('Category slug already exists.');
        }
        const next = [
            ...this.categories(),
            {
                id: `news_category_${Date.now()}`,
                name: normalizedName,
                slug: normalizedSlug,
                order: this.categories().length + 1
            }
        ];
        await this.persist(next);
    }
    async updateCategory(id, name, slug) {
        const normalizedName = this.normalizeName(name);
        const normalizedSlug = this.normalizeSlug(slug || normalizedName);
        if (!normalizedName) {
            throw new Error('Category name is required.');
        }
        if (!normalizedSlug) {
            throw new Error('Category slug is required.');
        }
        if (this.hasDuplicateName(normalizedName, id)) {
            throw new Error('Category already exists.');
        }
        if (this.hasDuplicateSlug(normalizedSlug, id)) {
            throw new Error('Category slug already exists.');
        }
        const next = this.categories().map(category => category.id === id ? { ...category, name: normalizedName, slug: normalizedSlug } : category);
        await this.persist(next);
    }
    async deleteCategory(id) {
        const next = this.categories().filter(category => category.id !== id);
        await this.persist(next);
    }
    listenToCategories() {
        this.firebaseService.listenToDocument(this.settingsCollection, this.docId, (data) => {
            if (data === null) {
                void this.firebaseService.set(`${this.settingsCollection}/${this.docId}`, { categories: [] });
                this.categories.set([]);
                return;
            }
            this.categories.set(this.normalizeCategories(data.categories || []));
        });
    }
    async persist(categories) {
        const normalized = this.normalizeCategories(categories);
        this.categories.set(normalized);
        await this.firebaseService.set(`${this.settingsCollection}/${this.docId}`, { categories: normalized });
    }
    normalizeCategories(categories) {
        return categories
            .map((category, index) => ({
            id: category.id || `news_category_${index + 1}`,
            name: this.normalizeName(category.name),
            slug: this.normalizeSlug(category.slug || category.name),
            order: index + 1
        }))
            .filter(category => category.name && category.slug)
            .sort((a, b) => a.order - b.order);
    }
    normalizeName(name) {
        return String(name || '').trim();
    }
    normalizeSlug(value) {
        return String(value || '')
            .toLowerCase()
            .trim()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-');
    }
    hasDuplicateName(name, excludeId) {
        const target = name.toLowerCase();
        return this.categories().some(category => category.id !== excludeId && category.name.toLowerCase() === target);
    }
    hasDuplicateSlug(slug, excludeId) {
        const target = slug.toLowerCase();
        return this.categories().some(category => category.id !== excludeId && category.slug.toLowerCase() === target);
    }
};
NewsCategoriesService = __decorate([
    Injectable({ providedIn: 'root' })
], NewsCategoriesService);
export { NewsCategoriesService };
