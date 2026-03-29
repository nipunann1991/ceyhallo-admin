import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ExcludedCategoriesService {
  firebaseService = inject(FirebaseService);
  authService = inject(AuthService);

  excludedCategories = signal<string[]>([]);
  private readonly SETTINGS_COLLECTION = 'settings';
  private readonly EXCLUDED_CATEGORIES_DOC_ID = 'excludedCategories';

  constructor() {
    this.listenToExcludedCategories();
  }

  private listenToExcludedCategories() {
    this.firebaseService.listenToDocument<{ categoryIds: string[] }>(this.SETTINGS_COLLECTION, this.EXCLUDED_CATEGORIES_DOC_ID, (data) => {
      if (data === null) {
        // Document doesn't exist, so create it with an empty array
        this.firebaseService.set(`${this.SETTINGS_COLLECTION}/${this.EXCLUDED_CATEGORIES_DOC_ID}`, { categoryIds: [] });
        this.excludedCategories.set([]);
      } else {
        this.excludedCategories.set(data?.categoryIds || []);
      }
    });
  }

  toggleCategoryExclusion(categoryId: string) {
    const current = this.excludedCategories();
    let updated: string[];

    if (current.includes(categoryId)) {
      updated = current.filter(id => id !== categoryId);
    } else {
      updated = [...current, categoryId];
    }
    void this.updateExcludedCategoriesInDb(updated);
  }

  async setCategoryExclusion(categoryId: string, isExcluded: boolean) {
    const current = this.excludedCategories();
    const isCurrentlyExcluded = current.includes(categoryId);

    if (isCurrentlyExcluded === isExcluded) {
      return;
    }

    const updated = isExcluded
      ? [...current, categoryId]
      : current.filter(id => id !== categoryId);

    this.excludedCategories.set(updated);
    await this.updateExcludedCategoriesInDb(updated);
  }

  private async updateExcludedCategoriesInDb(categoryIds: string[]) {
    try {
      await this.firebaseService.set(`${this.SETTINGS_COLLECTION}/${this.EXCLUDED_CATEGORIES_DOC_ID}`, { categoryIds });
    } catch (e: any) {
      console.error('Failed to update excluded categories in DB:', e);
      // Optionally, revert local state or show a toast
    }
  }
}
