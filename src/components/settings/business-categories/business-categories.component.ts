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
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-bold text-slate-700">Business Categories</h3>
          <p class="text-slate-500 text-sm">Manage business categories and select which to exclude from the app.</p>
        </div>
        <button (click)="openModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Category
        </button>
      </div>

      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p class="text-lg font-semibold text-slate-700 mb-4">Manage & Exclude Categories</p>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="px-6 py-3 w-16 text-center">Order</th>
                <th class="px-6 py-3">Category Name</th>
                <th class="px-6 py-3 text-center">Excluded</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
          @for (category of categories(); track category.id; let i = $index) {
            <tr class="hover:bg-slate-50 transition-colors group"
                [draggable]="true"
                (dragstart)="onDragStart($event, i)"
                (dragover)="onDragOver($event)"
                (drop)="onDrop($event, i)"
                [class.cursor-move]="true"
                [class.opacity-50]="draggedIndex === i"
                [class.bg-indigo-50]="draggedIndex === i">
                <td class="px-6 py-4 text-center font-mono font-medium text-slate-400">
                  <div class="flex items-center justify-center gap-2">
                    <div class="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </div>
                    {{ category.order }}
                  </div>
                </td>
                <td class="px-6 py-4 font-medium text-slate-900">{{ category.name }}</td>
                <td class="px-6 py-4 text-center">
                  <input 
                    type="checkbox" 
                    [checked]="category.isExcluded"
                    (change)="toggleCategoryExclusion(category)"
                    class="form-checkbox h-5 w-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openModal(category)" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button (click)="openConfirmModal(category)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    @if (showModal()) {
      <app-business-category-modal 
        [category]="selectedCategory()" 
        [maxOrder]="categories().length" 
        (close)="closeModal()" 
        (saved)="onSaved()">
      </app-business-category-modal>
    }

    @if (showConfirmModal()) {
      <app-confirm-modal 
        title="Delete Category" 
        [message]="confirmMessage()" 
        (confirm)="confirmDelete()" 
        (cancel)="closeConfirmModal()">
      </app-confirm-modal>
    }
  `
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

  async toggleCategoryExclusion(category: TaxonomyItem) {
    const newExcludedState = !category.isExcluded;
    try {
      await this.firebaseService.update('taxonomy_business', category.id, { isExcluded: newExcludedState });
      this.toastService.success(`'${category.name}' has been ${newExcludedState ? 'excluded' : 'included'}.`);
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
