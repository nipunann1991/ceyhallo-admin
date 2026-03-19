
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { News } from '../../models/news.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { NewsDetailComponent } from './news-detail.component';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, NewsDetailComponent],
  templateUrl: './news.component.html'
})
export class NewsComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  
  newsList = signal<News[]>([]);
  searchQuery = signal('');

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  // Reorder State
  isReordering = signal(false);
  draggedIndex: number | null = null;
  
  // Selection
  selectedNews = signal<News | null>(null);
  showArchived = signal(false);

  filteredNews = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const archived = this.showArchived();
    let data = [...this.newsList()];

    if (this.isReordering()) {
      // In reorder mode: Show only Published & Featured, sorted by featuredOrder
      return data
        .filter(n => n.isFeatured && n.isPublished && !n.isArchived)
        .sort((a, b) => (a.featuredOrder || 9999) - (b.featuredOrder || 9999));
    }

    return data.filter(n => {
      const matchesQuery = n.title?.toLowerCase().includes(query) || 
                          n.excerpt?.toLowerCase().includes(query) ||
                          n.author?.toLowerCase().includes(query) ||
                          n.category?.toLowerCase().includes(query);
      const matchesArchive = archived ? n.isArchived === true : !n.isArchived;
      return matchesQuery && matchesArchive;
    });
  });

  paginatedNews = computed(() => {
    const data = this.filteredNews();
    if (this.isReordering()) {
      return data; // Show all when reordering
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  constructor() {}

  ngOnInit() {
    this.firebaseService.listenToPath<News>('news', (data) => {
      // Sort by publishedDate descending by default
      const sorted = data.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      this.newsList.set(sorted);
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  view(news: News) {
    this.selectedNews.set(news);
  }

  closePanel() {
    this.selectedNews.set(null);
  }

  copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      this.toastService.success('ID copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  async duplicate(item: News) {
    if (!this.authService.isAdmin()) return;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = item;
    const newItem = {
        ...data,
        title: `${data.title} (Copy)`,
        isPublished: false,
        createdDate: new Date().toISOString()
    };

    try {
        await this.firebaseService.create('news', newItem);
        this.toastService.success('Article duplicated as draft.');
    } catch(e: any) {
        this.toastService.error('Duplicate failed: ' + e.message);
    }
  }

  // --- Reorder Logic ---

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

    const displayList = [...this.filteredNews()];
    const [draggedItem] = displayList.splice(this.draggedIndex, 1);
    displayList.splice(dropIndex, 0, draggedItem);

    // Prepare updates
    const updates: Promise<void>[] = [];
    const updatedFullList = [...this.newsList()];

    displayList.forEach((item, index) => {
      const newOrder = index + 1;
      if (item.featuredOrder !== newOrder) {
        item.featuredOrder = newOrder;
        updates.push(this.firebaseService.update('news', item.id, { featuredOrder: newOrder }));
        
        // Update local state
        const match = updatedFullList.find(n => n.id === item.id);
        if (match) match.featuredOrder = newOrder;
      }
    });

    this.newsList.set(updatedFullList);
    this.draggedIndex = null;

    try {
      await Promise.all(updates);
      this.toastService.success('Featured order saved');
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
      await this.firebaseService.delete('news', id);
      this.toastService.success('News deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Failed to delete: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }

  async toggleArchive(news: News) {
    if (!this.authService.isAdmin()) return;
    
    try {
      const newArchivedState = !news.isArchived;
      await this.firebaseService.update('news', news.id, { isArchived: newArchivedState });
      this.toastService.success(newArchivedState ? 'Article archived' : 'Article restored');
    } catch (e: any) {
      this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
    }
  }
}
