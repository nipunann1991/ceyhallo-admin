import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../../services/firebase.service';
import { ToastService } from '../../../services/toast.service';
import { ExcludedCategoriesService } from '../../../services/excluded-categories.service';
import { BusinessCategoryModalComponent } from './business-category-modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
import { TaxonomyItem } from '../../../models/taxonomy.model';

@Component({
  selector: 'app-business-categories',
  standalone: true,
  imports: [CommonModule, BusinessCategoryModalComponent, ConfirmModalComponent],
  templateUrl: './business-categories.component.html'
})
export class BusinessCategoriesComponent implements OnInit {
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  excludedCategoriesService = inject(ExcludedCategoriesService);

  categories = signal<TaxonomyItem[]>([]);
  excludedCategories = this.excludedCategoriesService.excludedCategories; // Use the service's signal
  showModal = signal(false);
  showConfirmModal = signal(false);
  selectedCategory = signal<TaxonomyItem | null>(null);
  confirmMessage = computed(() => `Are you sure you want to delete the category '${this.selectedCategory()?.name}'?`);
  draggedIndex: number | null = null;

  ngOnInit() {
    this.firebaseService.listenToPath<TaxonomyItem>('taxonomy_business', (data) => {
      const sortedData = data.sort((a, b) => (a.order || 0) - (b.order || 0));
      this.categories.set(sortedData);
    });

    // The service already listens to excluded categories, so no need to listen here
  }

  isCategoryExcluded(categoryId: string) {
    return this.excludedCategories().includes(categoryId);
  }

  async toggleCategoryExclusion(categoryId: string, isExcluded: boolean) {
    try {
      await this.excludedCategoriesService.setCategoryExclusion(categoryId, isExcluded);
      this.toastService.success(isExcluded ? 'Category excluded.' : 'Category included.');
    } catch (e: any) {
      this.toastService.error(e.message);
    }
  }

  openModal(category: TaxonomyItem | null = null) {
    this.selectedCategory.set(category);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedCategory.set(null);
  }

  onSaved() {
    this.closeModal();
    // No need to manually refresh data, listener will do it
  }

  openConfirmModal(category: TaxonomyItem) {
    this.selectedCategory.set(category);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.selectedCategory.set(null);
  }

  async confirmDelete() {
    if (!this.selectedCategory()) return;
    try {
      await this.firebaseService.delete('taxonomy_business', this.selectedCategory()!.id);
      this.toastService.success('Category deleted');
    } catch (e: any) {
      this.toastService.error(e.message);
    }
    this.closeConfirmModal();
  }

  onDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    event.dataTransfer?.setData('text/plain', index.toString());
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    if (this.draggedIndex === null) return;

    const cats = [...this.categories()];
    const draggedItem = cats.splice(this.draggedIndex, 1)[0];
    cats.splice(dropIndex, 0, draggedItem);

    this.categories.set(cats);
    this.draggedIndex = null;

    // Update order in Firebase
    const updates = cats.map((cat, index) => 
      this.firebaseService.update('taxonomy_business', cat.id, { order: index })
    );
    Promise.all(updates).then(() => {
      this.toastService.success('Order updated');
    }).catch(e => {
      this.toastService.error('Failed to update order');
    });
  }
}
