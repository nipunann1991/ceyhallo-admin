import { Component, OnInit, signal, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { TaxonomyItem } from '../../../models/taxonomy.model';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';

@Component({
  selector: 'app-taxonomy',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  templateUrl: './taxonomy.component.html'
})
export class TaxonomyComponent implements OnInit {
  collectionName = input.required<string>();
  title = input.required<string>();
  description = input<string>('');

  items = signal<TaxonomyItem[]>([]);
  newItemName = signal('');
  isAdding = signal(false);
  
  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  constructor(
    public authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.firebaseService.listenToPath<TaxonomyItem>(this.collectionName(), (data) => {
      // Filter out 'Popular' and 'Featured' categories
      const filteredData = data.filter(item => item.name !== 'Popular' && item.name !== 'Featured');
      // Sort alphabetically
      const sorted = filteredData.sort((a, b) => a.name.localeCompare(b.name));
      this.items.set(sorted);
    });
  }

  async add() {
    if (!this.newItemName().trim()) return;
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized');
      return;
    }

    this.isAdding.set(true);
    try {
      const name = this.newItemName().trim();
      // Check for duplicate
      if (this.items().some(i => i.name.toLowerCase() === name.toLowerCase())) {
        this.toastService.error('Category already exists');
        return;
      }

      await this.firebaseService.create(this.collectionName(), {
        name: name,
        createdAt: new Date().toISOString()
      });
      this.newItemName.set('');
      this.toastService.success('Category added');
    } catch (e: any) {
      this.toastService.error('Failed to add: ' + e.message);
    } finally {
      this.isAdding.set(false);
    }
  }

  delete(id: string) {
    if (!this.authService.isAdmin()) return;
    this.itemToDelete.set(id);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  async toggleExcluded(item: TaxonomyItem, event: Event) {
    if (!this.authService.isAdmin()) return;
    const isExcluded = (event.target as HTMLInputElement).checked;
    try {
      await this.firebaseService.update(this.collectionName(), item.id, { isExcluded });
      this.toastService.success(`Category '${item.name}' ${isExcluded ? 'excluded' : 'included'}.`);
    } catch (e: any) {
      this.toastService.error('Failed to update exclusion status.');
    }
  }





  async confirmDelete() {
    const id = this.itemToDelete();
    if (!id) return;

    try {
      await this.firebaseService.delete(this.collectionName(), id);
      this.toastService.success('Category deleted');
    } catch (e: any) {
      this.toastService.error('Failed to delete: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }
}