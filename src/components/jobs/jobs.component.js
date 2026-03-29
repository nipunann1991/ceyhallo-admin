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
import { JobDetailComponent } from './job-detail.component';
let JobsComponent = class JobsComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.jobs = signal([]);
        this.searchQuery = signal('');
        // Pagination
        this.itemsPerPage = 10;
        this.currentPage = signal(1);
        // Reorder State
        this.isReordering = signal(false);
        this.draggedIndex = null;
        // Location Data
        this.locations = signal([]);
        // Selection
        this.selectedJob = signal(null);
        this.showArchived = signal(false);
        this.filteredJobs = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const locs = this.locations();
            const archived = this.showArchived();
            let data = [...this.jobs()];
            // Map location data
            data = data.map(j => {
                // Derive country code if missing
                const displayJob = { ...j };
                if (!displayJob.countryCode && displayJob.cityCode) {
                    const foundCountry = locs.find(c => c.cities.some((city) => city.code === displayJob.cityCode));
                    if (foundCountry) {
                        displayJob.countryCode = foundCountry.code;
                    }
                }
                return displayJob;
            });
            if (this.isReordering()) {
                // Reorder mode: Featured only, sorted by featuredOrder
                return data
                    .filter(j => j.isFeatured && !j.isArchived)
                    .sort((a, b) => (a.featuredOrder || 9999) - (b.featuredOrder || 9999));
            }
            return data.filter(j => {
                const matchesQuery = j.title?.toLowerCase().includes(query) ||
                    j.company?.toLowerCase().includes(query) ||
                    j.location?.toLowerCase().includes(query);
                const matchesArchive = archived ? j.isArchived === true : !j.isArchived;
                return matchesQuery && matchesArchive;
            });
        });
        this.paginatedJobs = computed(() => {
            const data = this.filteredJobs();
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
        this.firebaseService.listenToPath('jobs', (data) => {
            // Sort by postedDate descending by default
            const sorted = data.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
            this.jobs.set(sorted);
        });
        // Fetch Locations
        this.firebaseService.listenToPath('countries', (data) => {
            const mappedLocations = data.map(country => {
                let citiesArray = [];
                if (country.cities) {
                    if (Array.isArray(country.cities)) {
                        citiesArray = country.cities;
                    }
                    else {
                        citiesArray = Object.keys(country.cities).map(key => ({
                            code: key,
                            name: country.cities[key].name || country.cities[key]
                        }));
                    }
                }
                return { code: country.id, name: country.name, cities: citiesArray };
            });
            this.locations.set(mappedLocations);
        });
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
        this.currentPage.set(1);
    }
    view(job) {
        this.selectedJob.set(job);
    }
    closePanel() {
        this.selectedJob.set(null);
    }
    copyId(id) {
        navigator.clipboard.writeText(id).then(() => {
            this.toastService.success('ID copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
    // --- Reorder Logic ---
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
        const displayList = [...this.filteredJobs()];
        const [draggedItem] = displayList.splice(this.draggedIndex, 1);
        displayList.splice(dropIndex, 0, draggedItem);
        const updates = [];
        const updatedFullList = [...this.jobs()];
        displayList.forEach((item, index) => {
            const newOrder = index + 1;
            if (item.featuredOrder !== newOrder) {
                item.featuredOrder = newOrder;
                updates.push(this.firebaseService.update('jobs', item.id, { featuredOrder: newOrder }));
                // Optimistic update
                const match = updatedFullList.find(j => j.id === item.id);
                if (match)
                    match.featuredOrder = newOrder;
            }
        });
        this.jobs.set(updatedFullList);
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
            await this.firebaseService.delete('jobs', id);
            this.toastService.success('Job deleted successfully.');
        }
        catch (e) {
            this.toastService.error('Delete failed: ' + e.message);
        }
        finally {
            this.closeConfirmModal();
        }
    }
    async toggleArchive(job) {
        if (!this.authService.isAdmin())
            return;
        this.itemToArchive.set(job);
        this.showArchiveConfirmModal.set(true);
    }
    closeArchiveConfirmModal() {
        this.showArchiveConfirmModal.set(false);
        this.itemToArchive.set(null);
    }
    async confirmArchive() {
        const job = this.itemToArchive();
        if (!job)
            return;
        try {
            const newArchivedState = !job.isArchived;
            await this.firebaseService.update('jobs', job.id, { isArchived: newArchivedState });
            this.toastService.success(newArchivedState ? 'Job archived' : 'Job restored');
        }
        catch (e) {
            this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
        }
        finally {
            this.closeArchiveConfirmModal();
        }
    }
};
JobsComponent = __decorate([
    Component({
        selector: 'app-jobs',
        standalone: true,
        imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, JobDetailComponent],
        templateUrl: './jobs.component.html'
    })
], JobsComponent);
export { JobsComponent };
