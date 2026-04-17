import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { NewsCategoriesService, NewsCategorySetting } from '../../../services/news-categories.service';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';

@Component({
  selector: 'app-news-categories',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-2xl font-bold text-slate-900 tracking-tight">News Categories</h3>
          <p class="text-slate-500 text-sm mt-1">Manage the category list used by the news editor dropdown.</p>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <p class="text-lg font-semibold text-slate-900">Category List</p>
          <p class="text-sm text-slate-500 mt-1">Add, rename, or remove categories available when creating news articles.</p>
        </div>

        <div class="p-6 border-b border-slate-200">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input
              type="text"
              class="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#083594] focus:border-transparent"
              placeholder="Category name"
              [value]="newCategoryName()"
              (input)="onNewNameInput($event)"
              (keydown.enter)="addCategory()">
            <input
              type="text"
              class="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#083594] focus:border-transparent"
              placeholder="category-slug"
              [value]="newCategorySlug()"
              (input)="onNewSlugInput($event)"
              (keydown.enter)="addCategory()">
            <button
              type="button"
              (click)="addCategory()"
              class="bg-[#083594] hover:bg-[#062a71] text-white px-4 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-colors">
              Add Category
            </button>
          </div>
        </div>

        @if (categories().length > 0) {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-white text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th class="px-6 py-3 w-20 text-center">Order</th>
                  <th class="px-6 py-3">Category Name</th>
                  <th class="px-6 py-3">Slug</th>
                  <th class="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (category of categories(); track category.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 text-center font-mono text-slate-400">{{ category.order }}</td>
                    <td class="px-6 py-4">
                      @if (editingId() === category.id) {
                        <input
                          type="text"
                          class="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#083594] focus:border-transparent"
                          [value]="editingName()"
                          (input)="editingName.set($any($event.target).value)"
                          (keydown.enter)="saveEdit()">
                      } @else {
                        <span class="font-medium text-slate-900">{{ category.name }}</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      @if (editingId() === category.id) {
                        <input
                          type="text"
                          class="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#083594] focus:border-transparent"
                          [value]="editingSlug()"
                          (input)="onEditSlugInput($event)"
                          (keydown.enter)="saveEdit()">
                      } @else {
                        <span class="font-mono text-slate-500 text-sm">{{ category.slug }}</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        @if (editingId() === category.id) {
                          <button (click)="saveEdit()" class="px-3 py-1.5 rounded-lg bg-[#083594] text-white text-xs font-medium">Save</button>
                          <button (click)="cancelEdit()" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium">Cancel</button>
                        } @else {
                          <button (click)="startEdit(category)" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                          </button>
                          <button (click)="openDeleteModal(category)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="px-6 py-14 text-center text-slate-400">
            <p class="text-sm">No news categories yet.</p>
          </div>
        }
      </div>
    </div>

    @if (showDeleteModal()) {
      <app-confirm-modal
        title="Delete Category"
        [message]="deleteMessage()"
        (confirm)="confirmDelete()"
        (cancel)="closeDeleteModal()">
      </app-confirm-modal>
    }
  `
})
export class NewsCategoriesComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly newsCategoriesService = inject(NewsCategoriesService);
  private lastGeneratedAddSlug = '';

  categories = this.newsCategoriesService.categories;
  newCategoryName = signal('');
  newCategorySlug = signal('');
  editingId = signal<string | null>(null);
  editingName = signal('');
  editingSlug = signal('');
  categoryToDelete = signal<NewsCategorySetting | null>(null);
  showDeleteModal = signal(false);
  deleteMessage = computed(() => `Are you sure you want to delete '${this.categoryToDelete()?.name || ''}'?`);

  async addCategory() {
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized.');
      return;
    }

    try {
      await this.newsCategoriesService.addCategory(this.newCategoryName(), this.newCategorySlug());
      this.newCategoryName.set('');
      this.newCategorySlug.set('');
      this.lastGeneratedAddSlug = '';
      this.toastService.success('News category added.');
    } catch (e: any) {
      this.toastService.error(e.message || 'Failed to add category.');
    }
  }

  startEdit(category: NewsCategorySetting) {
    this.editingId.set(category.id);
    this.editingName.set(category.name);
    this.editingSlug.set(category.slug);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingName.set('');
    this.editingSlug.set('');
  }

  async saveEdit() {
    const id = this.editingId();
    if (!id) return;

    try {
      await this.newsCategoriesService.updateCategory(id, this.editingName(), this.editingSlug());
      this.toastService.success('News category updated.');
      this.cancelEdit();
    } catch (e: any) {
      this.toastService.error(e.message || 'Failed to update category.');
    }
  }

  openDeleteModal(category: NewsCategorySetting) {
    this.categoryToDelete.set(category);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.categoryToDelete.set(null);
    this.showDeleteModal.set(false);
  }

  async confirmDelete() {
    const category = this.categoryToDelete();
    if (!category) return;

    try {
      await this.newsCategoriesService.deleteCategory(category.id);
      this.toastService.success('News category deleted.');
    } catch (e: any) {
      this.toastService.error(e.message || 'Failed to delete category.');
    }

    this.closeDeleteModal();
  }

  onNewNameInput(event: Event) {
    const value = ((event.target as HTMLInputElement | null)?.value || '');
    this.newCategoryName.set(value);
    const generated = this.slugify(value);
    const current = this.newCategorySlug();
    if (!current || current === this.lastGeneratedAddSlug) {
      this.lastGeneratedAddSlug = generated;
      this.newCategorySlug.set(generated);
    }
  }

  onNewSlugInput(event: Event) {
    this.newCategorySlug.set(this.slugify((event.target as HTMLInputElement | null)?.value || ''));
  }

  onEditSlugInput(event: Event) {
    this.editingSlug.set(this.slugify((event.target as HTMLInputElement | null)?.value || ''));
  }

  private slugify(value: string) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }
}
