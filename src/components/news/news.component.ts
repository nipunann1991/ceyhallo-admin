
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { News } from '../../models/news.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { NewsDetailComponent } from './news-detail/news-detail.component';
import { TableSortController } from '../ui/table-sort.controller';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, NewsDetailComponent],
  templateUrl: './news.component.html'
})
export class NewsComponent extends TableSortController implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  route = inject(ActivatedRoute);
  
  newsList = signal<News[]>([]);
  searchQuery = signal('');

  // Pagination
  itemsPerPage = signal(10);
  currentPage = signal(1);

  // Reorder State
  isReordering = signal(false);
  draggedIndex: number | null = null;
  
  // Selection
  selectedNews = signal<News | null>(null);
  stateFilter = signal<'all' | 'published' | 'draft' | 'archived'>('all');
  hasActiveFilters = computed(() => this.stateFilter() !== 'all');

  filteredNews = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const stateFilter = this.stateFilter();
    let data = [...this.newsList()];

    if (this.isReordering()) {
      // In reorder mode: Show only Published & Featured, sorted by featuredOrder
      return data
        .filter(n => n.isFeatured && n.isPublished && !n.isArchived)
        .sort((a, b) => (a.featuredOrder || 9999) - (b.featuredOrder || 9999));
    }

    const rows = data.filter(n => {
      const matchesQuery = n.title?.toLowerCase().includes(query) || 
                          n.excerpt?.toLowerCase().includes(query) ||
                          n.author?.toLowerCase().includes(query) ||
                          n.category?.toLowerCase().includes(query);
      const status = n.isArchived ? 'archived' : (n.isPublished ? 'published' : 'draft');
      const matchesState = stateFilter === 'all' || status === stateFilter;
      return matchesQuery && matchesState;
    });
    return this.sortTableRows(rows, (news, column) => ({
      title: news.title,
      category: news.category,
      author: news.author,
      date: news.publishedDate,
      state: news.isArchived ? 'archived' : (news.isPublished ? 'published' : 'draft')
    })[column]);
  });

  paginatedNews = computed(() => {
    const data = this.filteredNews();
    if (this.isReordering()) {
      return data; // Show all when reordering
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);
  selectedNewsIds = signal<string[]>([]);
  deleteMode = signal<'single' | 'bulk' | null>(null);

  selectedNewsCount = computed(() => this.selectedNewsIds().length);

  areAllVisibleSelected = computed(() => {
    const visibleIds = this.paginatedNews().map(item => item.id);
    return visibleIds.length > 0 && visibleIds.every(id => this.selectedNewsIds().includes(id));
  });

  bulkDeleteMessage = computed(() => {
    const count = this.selectedNewsCount();
    return `Are you sure you want to delete ${count} selected article${count === 1 ? '' : 's'}? This action cannot be undone.`;
  });

  confirmDeleteTitle = computed(() => this.deleteMode() === 'bulk' ? 'Delete Selected Articles' : 'Delete Article');
  confirmDeleteMessage = computed(() => this.deleteMode() === 'bulk'
    ? this.bulkDeleteMessage()
    : 'Are you sure you want to delete this article? This action cannot be undone.');
  confirmDeleteLabel = computed(() => this.deleteMode() === 'bulk' ? 'Delete Selected' : 'Delete');

  constructor() { super(); }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const state = params.get('state');
      const query = params.get('q');

      if (state === 'all' || state === 'published' || state === 'draft' || state === 'archived') {
        this.stateFilter.set(state);
      } else {
        this.stateFilter.set('all');
      }

      this.searchQuery.set(query ?? '');
      this.currentPage.set(1);
    });

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

  updateStateFilter(value: 'all' | 'published' | 'draft' | 'archived') {
    this.stateFilter.set(value);
    this.currentPage.set(1);
  }

  view(news: News) {
    this.selectedNews.set(news);
  }

  isNewsSelected(id: string) {
    return this.selectedNewsIds().includes(id);
  }

  toggleNewsSelection(id: string, checked: boolean) {
    this.selectedNewsIds.update(current => {
      if (checked) {
        if (current.includes(id)) return current;
        return [...current, id];
      }
      return current.filter(item => item !== id);
    });
  }

  toggleAllVisibleNews(checked: boolean) {
    const visibleIds = this.paginatedNews().map(item => item.id);
    this.selectedNewsIds.update(current => {
      const currentSet = new Set(current);
      if (checked) {
        visibleIds.forEach(id => currentSet.add(id));
      } else {
        visibleIds.forEach(id => currentSet.delete(id));
      }
      return Array.from(currentSet);
    });
  }

  clearSelectedNews() {
    this.selectedNewsIds.set([]);
    this.deleteMode.set(null);
    this.itemToDelete.set(null);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.stateFilter.set('all');
    this.currentPage.set(1);
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
    if (!this.authService.canManageContent()) return;
    
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
    this.deleteMode.set('single');
    this.itemToDelete.set(id);
    this.showConfirmModal.set(true);
  }

  deleteSelected() {
    if (!this.authService.isAdmin()) return;
    if (!this.selectedNewsCount()) return;
    this.deleteMode.set('bulk');
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.itemToDelete.set(null);
    this.deleteMode.set(null);
  }

  async confirmDelete() {
    if (!this.authService.isAdmin()) {
      this.closeConfirmModal();
      return;
    }
    try {
      if (this.deleteMode() === 'bulk') {
        const ids = this.selectedNewsIds();
        if (!ids.length) return;
        await Promise.all(ids.map(id => this.firebaseService.delete('news', id)));
        this.toastService.success(`Deleted ${ids.length} news article${ids.length === 1 ? '' : 's'}.`);
        this.clearSelectedNews();
      } else {
        const id = this.itemToDelete();
        if (!id) return;
        await this.firebaseService.delete('news', id);
        this.selectedNewsIds.update(current => current.filter(item => item !== id));
        this.toastService.success('News deleted successfully.');
      }
    } catch (e: any) {
      this.toastService.error('Failed to delete: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }

  async toggleArchive(news: News) {
    if (!this.authService.canManageContent()) return;
    
    try {
      const newArchivedState = !news.isArchived;
      await this.firebaseService.update('news', news.id, { isArchived: newArchivedState });
      this.toastService.success(newArchivedState ? 'Article archived' : 'Article restored');
    } catch (e: any) {
      this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
    }
  }
}
