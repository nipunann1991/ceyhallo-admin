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
  templateUrl: './news-categories.component.html'
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
