import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Offer } from '../../models/offer.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { OfferDetailComponent } from './offer-detail.component';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, OfferDetailComponent],
  templateUrl: './offers.component.html'
})
export class OffersComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  
  offers = signal<Offer[]>([]);
  searchQuery = signal('');

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  // Reorder State
  isReordering = signal(false);
  draggedIndex: number | null = null;
  
  // CRUD State
  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  showArchiveConfirmModal = signal(false);
  itemToArchive = signal<Offer | null>(null);
  
  // Selection
  selectedOffer = signal<Offer | null>(null);
  showArchived = signal(false);

  filteredOffers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const archived = this.showArchived();
    
    // Sort logic: Order field first (asc), then fallback
    const sorted = [...this.offers()].sort((a, b) => (a.order || 9999) - (b.order || 9999));

    if (this.isReordering()) {
      // In reorder mode, only show active
      return sorted.filter(o => o.isActive && !o.isArchived);
    }

    return sorted.filter(item => {
      const matchesQuery = item.title?.toLowerCase().includes(query) || 
                          item.description?.toLowerCase().includes(query) ||
                          item.targetName?.toLowerCase().includes(query);
      const matchesArchive = archived ? item.isArchived === true : !item.isArchived;
      return matchesQuery && matchesArchive;
    });
  });

  paginatedOffers = computed(() => {
    const data = this.filteredOffers();
    if (this.isReordering()) {
      return data;
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  constructor() {}

  ngOnInit() {
    this.firebaseService.listenToPath<Offer>('offers', (data) => {
      this.offers.set(data);
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  view(offer: Offer) {
    this.selectedOffer.set(offer);
  }

  closePanel() {
    this.selectedOffer.set(null);
  }

  copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      this.toastService.success('ID copied');
    });
  }

  // --- Reordering Logic ---

  toggleReorderMode() {
    if (!this.authService.isAdmin()) return;
    this.isReordering.update(v => !v);
    this.currentPage.set(1);
    this.searchQuery.set('');
  }

  onDragStart(event: DragEvent, index: number) {
    if (!this.isReordering()) return;
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragOver(event: DragEvent) {
    if (!this.isReordering()) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  async onDrop(event: DragEvent, dropIndex: number) {
    if (!this.isReordering()) return;
    event.preventDefault();

    if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
      this.draggedIndex = null;
      return;
    }

    const displayList = [...this.filteredOffers()];
    const [draggedItem] = displayList.splice(this.draggedIndex, 1);
    displayList.splice(dropIndex, 0, draggedItem);

    // Prepare updates
    const updates: Promise<void>[] = [];
    const fullList = [...this.offers()];
    
    displayList.forEach((item, index) => {
      const newOrder = index + 1;
      if (item.order !== newOrder) {
        // Optimistic update
        item.order = newOrder;
        
        // Push update
        updates.push(this.firebaseService.update('offers', item.id, { order: newOrder }));
        
        // Update local full list ref
        const match = fullList.find(o => o.id === item.id);
        if (match) match.order = newOrder;
      }
    });
    
    this.offers.set(fullList);
    this.draggedIndex = null;

    try {
      await Promise.all(updates);
      this.toastService.success('Offers order saved');
    } catch (e) {
      console.error(e);
      this.toastService.error('Failed to save order');
    }
  }

  // --- CRUD ---

  delete(id: string) {
    if (!this.authService.isAdmin()) return;
    this.itemToDelete.set(id);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  async confirmDelete() {
    const id = this.itemToDelete();
    if (!id) return;

    try {
      await this.firebaseService.delete('offers', id);
      this.toastService.success('Offer deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Delete failed: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }

  async toggleArchive(offer: Offer) {
    if (!this.authService.isAdmin()) return;
    this.itemToArchive.set(offer);
    this.showArchiveConfirmModal.set(true);
  }

  closeArchiveConfirmModal() {
    this.showArchiveConfirmModal.set(false);
    this.itemToArchive.set(null);
  }

  async confirmArchive() {
    const offer = this.itemToArchive();
    if (!offer) return;

    try {
      const newArchivedState = !offer.isArchived;
      await this.firebaseService.update('offers', offer.id, { isArchived: newArchivedState });
      this.toastService.success(newArchivedState ? 'Offer archived' : 'Offer restored');
    } catch (e: any) {
      this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
    } finally {
      this.closeArchiveConfirmModal();
    }
  }
}