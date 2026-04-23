var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { NewsDetailComponent } from './news-detail.component';
let NewsComponent = class NewsComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.route = inject(ActivatedRoute);
        this.newsList = signal([]);
        this.searchQuery = signal('');
        // Pagination
        this.itemsPerPage = 10;
        this.currentPage = signal(1);
        // Reorder State
        this.isReordering = signal(false);
        this.draggedIndex = null;
        // Selection
        this.selectedNews = signal(null);
        this.stateFilter = signal('all');
        this.filteredNews = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const stateFilter = this.stateFilter();
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
                const status = n.isArchived ? 'archived' : (n.isPublished ? 'published' : 'draft');
                const matchesState = stateFilter === 'all' || status === stateFilter;
                return matchesQuery && matchesState;
            });
        });
        this.paginatedNews = computed(() => {
            const data = this.filteredNews();
            if (this.isReordering()) {
                return data; // Show all when reordering
            }
            const start = (this.currentPage() - 1) * this.itemsPerPage;
            return data.slice(start, start + this.itemsPerPage);
        });
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
    }
    ngOnInit() {
        this.route.queryParamMap.subscribe((params) => {
            const state = params.get('state');
            const query = params.get('q');
            if (state === 'all' || state === 'published' || state === 'draft' || state === 'archived') {
                this.stateFilter.set(state);
            }
            else {
                this.stateFilter.set('all');
            }
            this.searchQuery.set(query ?? '');
            this.currentPage.set(1);
        });
        this.firebaseService.listenToPath('news', (data) => {
            // Sort by publishedDate descending by default
            const sorted = data.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
            this.newsList.set(sorted);
        });
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
        this.currentPage.set(1);
    }
    updateStateFilter(value) {
        this.stateFilter.set(value);
        this.currentPage.set(1);
    }
    view(news) {
        this.selectedNews.set(news);
    }
    closePanel() {
        this.selectedNews.set(null);
    }
    copyId(id) {
        navigator.clipboard.writeText(id).then(() => {
            this.toastService.success('ID copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
    async duplicate(item) {
        if (!this.authService.isAdmin())
            return;
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
        }
        catch (e) {
            this.toastService.error('Duplicate failed: ' + e.message);
        }
    }
    // --- Reorder Logic ---
    toggleReorderMode() {
        if (!this.authService.isAdmin())
            return;
        this.isReordering.update(v => !v);
        this.currentPage.set(1);
        this.searchQuery.set('');
    }
    clearFilters() {
        this.searchQuery.set('');
        this.stateFilter.set('all');
        this.currentPage.set(1);
    }
    onDragStart(event, index) {
        if (!this.isReordering())
            return;
        this.draggedIndex = index;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', index.toString());
        }
    }
    onDragOver(event) {
        if (!this.isReordering())
            return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }
    async onDrop(event, dropIndex) {
        if (!this.isReordering())
            return;
        event.preventDefault();
        if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
            this.draggedIndex = null;
            return;
        }
        const displayList = [...this.filteredNews()];
        const [draggedItem] = displayList.splice(this.draggedIndex, 1);
        displayList.splice(dropIndex, 0, draggedItem);
        // Prepare updates
        const updates = [];
        const updatedFullList = [...this.newsList()];
        displayList.forEach((item, index) => {
            const newOrder = index + 1;
            if (item.featuredOrder !== newOrder) {
                item.featuredOrder = newOrder;
                updates.push(this.firebaseService.update('news', item.id, { featuredOrder: newOrder }));
                // Update local state
                const match = updatedFullList.find(n => n.id === item.id);
                if (match)
                    match.featuredOrder = newOrder;
            }
        });
        this.newsList.set(updatedFullList);
        this.draggedIndex = null;
        try {
            await Promise.all(updates);
            this.toastService.success('Featured order saved');
        }
        catch (e) {
            console.error(e);
            this.toastService.error('Failed to save order');
        }
    }
    // --- CRUD ---
    delete(id) {
        if (!this.authService.isAdmin())
            return;
        this.itemToDelete.set(id);
        this.showConfirmModal.set(true);
    }
    closeConfirmModal() {
        this.showConfirmModal.set(false);
        this.itemToDelete.set(null);
    }
    async confirmDelete() {
        const id = this.itemToDelete();
        if (!id)
            return;
        try {
            await this.firebaseService.delete('news', id);
            this.toastService.success('News deleted successfully.');
        }
        catch (e) {
            this.toastService.error('Failed to delete: ' + e.message);
        }
        finally {
            this.closeConfirmModal();
        }
    }
    async toggleArchive(news) {
        if (!this.authService.isAdmin())
            return;
        try {
            const newArchivedState = !news.isArchived;
            await this.firebaseService.update('news', news.id, { isArchived: newArchivedState });
            this.toastService.success(newArchivedState ? 'Article archived' : 'Article restored');
        }
        catch (e) {
            this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
        }
    }
};
NewsComponent = __decorate([
    Component({
        selector: 'app-news',
        standalone: true,
        imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, NewsDetailComponent],
        templateUrl: './news.component.html'
    })
], NewsComponent);
export { NewsComponent };
