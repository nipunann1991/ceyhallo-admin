import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';

export interface NewsCategorySetting {
  id: string;
  name: string;
  slug: string;
  order: number;
}

@Injectable({ providedIn: 'root' })
export class NewsCategoriesService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly settingsCollection = 'settings';
  private readonly docId = 'news_categories';

  categories = signal<NewsCategorySetting[]>([]);

  constructor() {
    this.listenToCategories();
  }

  async addCategory(name: string, slug?: string) {
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

  async updateCategory(id: string, name: string, slug?: string) {
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

    const next = this.categories().map(category =>
      category.id === id ? { ...category, name: normalizedName, slug: normalizedSlug } : category
    );

    await this.persist(next);
  }

  async deleteCategory(id: string) {
    const next = this.categories().filter(category => category.id !== id);
    await this.persist(next);
  }

  private listenToCategories() {
    this.firebaseService.listenToDocument<{ categories?: NewsCategorySetting[] }>(
      this.settingsCollection,
      this.docId,
      (data) => {
        if (data === null) {
          void this.firebaseService.set(`${this.settingsCollection}/${this.docId}`, { categories: [] });
          this.categories.set([]);
          return;
        }

        this.categories.set(this.normalizeCategories(data.categories || []));
      }
    );
  }

  private async persist(categories: NewsCategorySetting[]) {
    const normalized = this.normalizeCategories(categories);
    this.categories.set(normalized);
    await this.firebaseService.set(`${this.settingsCollection}/${this.docId}`, { categories: normalized });
  }

  private normalizeCategories(categories: NewsCategorySetting[]) {
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

  private normalizeName(name: string) {
    return String(name || '').trim();
  }

  private normalizeSlug(value: string) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private hasDuplicateName(name: string, excludeId?: string) {
    const target = name.toLowerCase();
    return this.categories().some(category =>
      category.id !== excludeId && category.name.toLowerCase() === target
    );
  }

  private hasDuplicateSlug(slug: string, excludeId?: string) {
    const target = slug.toLowerCase();
    return this.categories().some(category =>
      category.id !== excludeId && category.slug.toLowerCase() === target
    );
  }
}
