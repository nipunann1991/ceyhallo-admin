var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { BannerDetailComponent } from './banner-detail.component';
let BannersComponent = class BannersComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.banners = signal([]);
        this.searchQuery = signal('');
        // Pagination
        this.itemsPerPage = 10;
        this.currentPage = signal(1);
        // Reorder State
        this.isReordering = signal(false);
        this.draggedIndex = null;
        // Selection
        this.selectedBanner = signal(null);
        this.showArchived = signal(false);
        this.filteredBanners = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const archived = this.showArchived();
            // Sort logic: Order field first (asc), then fallback
            const sorted = [...this.banners()].sort((a, b) => (a.order || 9999) - (b.order || 9999));
            if (this.isReordering()) {
                return sorted.filter(b => b.isActive && !b.isArchived);
            }
            return sorted.filter(b => {
                const matchesQuery = b.title?.toLowerCase().includes(query) ||
                    b.description?.toLowerCase().includes(query);
                const matchesArchive = archived ? b.isArchived === true : !b.isArchived;
                return matchesQuery && matchesArchive;
            });
        });
        this.paginatedBanners = computed(() => {
            const data = this.filteredBanners();
            if (this.isReordering()) {
                return data;
            }
            const start = (this.currentPage() - 1) * this.itemsPerPage;
            return data.slice(start, start + this.itemsPerPage);
        });
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
        this.showArchiveConfirmModal = signal(false);
        this.itemToArchive = signal(null);
    }
    ngOnInit() {
        this.firebaseService.listenToPath('banners', (data) => {
            this.banners.set(data);
        });
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
        this.currentPage.set(1);
    }
    view(banner) {
        this.selectedBanner.set(banner);
    }
    closePanel() {
        this.selectedBanner.set(null);
    }
    copyId(id) {
        navigator.clipboard.writeText(id).then(() => {
            this.toastService.success('ID copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
    // --- Reordering Logic ---
    toggleReorderMode() {
        if (!this.authService.isAdmin())
            return;
        this.isReordering.update(v => !v);
        this.currentPage.set(1);
        this.searchQuery.set('');
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
        const displayList = [...this.filteredBanners()];
        const [draggedItem] = displayList.splice(this.draggedIndex, 1);
        displayList.splice(dropIndex, 0, draggedItem);
        const updates = [];
        const updatedFullList = [...this.banners()];
        displayList.forEach((banner, index) => {
            const newOrder = index + 1;
            if (banner.order !== newOrder) {
                banner.order = newOrder;
                updates.push(this.firebaseService.update('banners', banner.id, { order: newOrder }));
                const match = updatedFullList.find(b => b.id === banner.id);
                if (match)
                    match.order = newOrder;
            }
        });
        this.banners.set(updatedFullList);
        this.draggedIndex = null;
        try {
            await Promise.all(updates);
            this.toastService.success('Order saved');
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
            await this.firebaseService.delete('banners', id);
            this.toastService.success('Banner deleted successfully.');
        }
        catch (e) {
            this.toastService.error('Failed to delete banner: ' + (e.message || 'Unknown error'));
        }
        finally {
            this.closeConfirmModal();
        }
    }
    async duplicate(banner) {
        if (!this.authService.isAdmin())
            return;
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
        }
        catch (e) {
            this.toastService.error('Failed to duplicate banner: ' + (e.message || 'Unknown error'));
        }
    }
    async toggleArchive(banner) {
        if (!this.authService.isAdmin())
            return;
        this.itemToArchive.set(banner);
        this.showArchiveConfirmModal.set(true);
    }
    closeArchiveConfirmModal() {
        this.showArchiveConfirmModal.set(false);
        this.itemToArchive.set(null);
    }
    async confirmArchive() {
        const banner = this.itemToArchive();
        if (!banner)
            return;
        try {
            const newArchivedState = !banner.isArchived;
            await this.firebaseService.update('banners', banner.id, { isArchived: newArchivedState });
            this.toastService.success(newArchivedState ? 'Banner archived' : 'Banner restored');
        }
        catch (e) {
            this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
        }
        finally {
            this.closeArchiveConfirmModal();
        }
    }
};
BannersComponent = __decorate([
    Component({
        selector: 'app-banners',
        standalone: true,
        imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, BannerDetailComponent],
        templateUrl: './banners.component.html'
    })
], BannersComponent);
export { BannersComponent };
