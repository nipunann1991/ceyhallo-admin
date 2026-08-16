import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Banner } from '../../models/banner.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { BannerDetailComponent } from './banner-detail/banner-detail.component';
import { TableSortController } from '../ui/table-sort.controller';

@Component({
  selector: 'app-banners',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, BannerDetailComponent],
  templateUrl: './banners.component.html'
})
export class BannersComponent extends TableSortController implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  
  banners = signal<Banner[]>([]);
  searchQuery = signal('');

  // Pagination
  itemsPerPage = signal(10);
  currentPage = signal(1);

  // Reorder State
  isReordering = signal(false);
  draggedIndex: number | null = null;
  
  // Selection
  selectedBanner = signal<Banner | null>(null);
  showArchived = signal(false);

  filteredBanners = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const archived = this.showArchived();
    
    // Sort logic: Order field first (asc), then fallback
    const sorted = [...this.banners()].sort((a, b) => (a.order || 9999) - (b.order || 9999));

    if (this.isReordering()) {
      return sorted.filter(b => b.isActive && !b.isArchived);
    }

    const rows = sorted.filter(b => {
      const matchesQuery = b.title?.toLowerCase().includes(query) || 
                          b.description?.toLowerCase().includes(query);
      const matchesArchive = archived ? b.isArchived === true : !b.isArchived;
      return matchesQuery && matchesArchive;
    });
    return this.sortTableRows(rows, (banner, column) => ({
      title: banner.title,
      category: banner.tag,
      publisher: banner.publishedBy,
      date: banner.publishedDate,
      state: banner.isArchived ? 'archived' : (banner.isActive ? 'active' : 'inactive')
    })[column]);
  });

  paginatedBanners = computed(() => {
    const data = this.filteredBanners();
    if (this.isReordering()) {
      return data; 
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  showArchiveConfirmModal = signal(false);
  itemToArchive = signal<Banner | null>(null);

  constructor() { super(); }

  ngOnInit() {
    this.firebaseService.listenToPath<Banner>('banners', (data) => {
      this.banners.set(data);
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  view(banner: Banner) {
    this.selectedBanner.set(banner);
  }

  closePanel() {
    this.selectedBanner.set(null);
  }

  copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      this.toastService.success('ID copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  // --- Reordering Logic ---

  toggleReorderMode() {
    if (!this.authService.canManageContent()) return;
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

    const displayList = [...this.filteredBanners()];
    const [draggedItem] = displayList.splice(this.draggedIndex, 1);
    displayList.splice(dropIndex, 0, draggedItem);

    const updates: Promise<void>[] = [];
    const updatedFullList = [...this.banners()];

    displayList.forEach((banner, index) => {
      const newOrder = index + 1;
      if (banner.order !== newOrder) {
        banner.order = newOrder;
        updates.push(this.firebaseService.update('banners', banner.id, { order: newOrder }));
        
        const match = updatedFullList.find(b => b.id === banner.id);
        if (match) match.order = newOrder;
      }
    });

    this.banners.set(updatedFullList);
    this.draggedIndex = null;

    try {
      await Promise.all(updates);
      this.toastService.success('Order saved');
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
    if (!this.authService.isAdmin()) {
      this.closeConfirmModal();
      return;
    }
    const id = this.itemToDelete();
    if (!id) return;

    try {
      await this.firebaseService.delete('banners', id);
      this.toastService.success('Banner deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Failed to delete banner: ' + (e.message || 'Unknown error'));
    } finally {
      this.closeConfirmModal();
    }
  }

  async duplicate(banner: Banner) {
    if (!this.authService.canManageContent()) return;
    
    try {
      const { id, ...bannerData } = banner;
      const duplicatedData = {
        ...bannerData,
        title: `${bannerData.title} (Copy)`,
        isActive: false, // Default to inactive for safety
        publishedDate: new Date().toLocaleDateString()
      };
      
      await this.firebaseService.create('banners', duplicatedData);
      this.toastService.success('Banner duplicated successfully');
    } catch (e: any) {
      this.toastService.error('Failed to duplicate banner: ' + (e.message || 'Unknown error'));
    }
  }

  async toggleArchive(banner: Banner) {
    if (!this.authService.canManageContent()) return;
    this.itemToArchive.set(banner);
    this.showArchiveConfirmModal.set(true);
  }

  closeArchiveConfirmModal() {
    this.showArchiveConfirmModal.set(false);
    this.itemToArchive.set(null);
  }

  async confirmArchive() {
    const banner = this.itemToArchive();
    if (!banner) return;

    try {
      const newArchivedState = !banner.isArchived;
      await this.firebaseService.update('banners', banner.id, { isArchived: newArchivedState });
      this.toastService.success(newArchivedState ? 'Banner archived' : 'Banner restored');
    } catch (e: any) {
      this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
    } finally {
      this.closeArchiveConfirmModal();
    }
  }
}
