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
import { EventDetailComponent } from './event-detail.component';
let EventsComponent = class EventsComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.events = signal([]);
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
        this.selectedEvent = signal(null);
        this.showArchived = signal(false);
        this.filteredEvents = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const locs = this.locations();
            const archived = this.showArchived();
            let data = [...this.events()];
            // Map location data
            data = data.map(e => {
                const displayEvent = { ...e };
                if (!displayEvent.countryCode && displayEvent.cityCode) {
                    for (const c of locs) {
                        const found = c.cities.find((cit) => cit.code === displayEvent.cityCode);
                        if (found) {
                            displayEvent.countryCode = c.code;
                            break;
                        }
                    }
                }
                return displayEvent;
            });
            if (this.isReordering()) {
                // Reorder mode: Show ALL events sorted by eventBannerOrder
                return data
                    .filter(e => !e.isArchived)
                    .sort((a, b) => (a.eventBannerOrder || 9999) - (b.eventBannerOrder || 9999));
            }
            return data.filter(e => {
                const matchesQuery = e.title?.toLowerCase().includes(query) ||
                    e.description?.toLowerCase().includes(query) ||
                    e.location?.toLowerCase().includes(query);
                const matchesArchive = archived ? e.isArchived === true : !e.isArchived;
                return matchesQuery && matchesArchive;
            });
        });
        this.paginatedEvents = computed(() => {
            const data = this.filteredEvents();
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
        this.firebaseService.listenToPath('events', (data) => {
            const sorted = data.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
            this.events.set(sorted);
        });
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
    view(event) {
        this.selectedEvent.set(event);
    }
    closePanel() {
        this.selectedEvent.set(null);
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
            await this.firebaseService.create('events', newItem);
            this.toastService.success('Event duplicated as draft.');
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
        const displayList = [...this.filteredEvents()];
        const [draggedItem] = displayList.splice(this.draggedIndex, 1);
        displayList.splice(dropIndex, 0, draggedItem);
        const updates = [];
        const updatedFullList = [...this.events()];
        displayList.forEach((item, index) => {
            const newOrder = index + 1;
            if (item.eventBannerOrder !== newOrder) {
                item.eventBannerOrder = newOrder;
                updates.push(this.firebaseService.update('events', item.id, { eventBannerOrder: newOrder }));
                // Optimistic update
                const match = updatedFullList.find(e => e.id === item.id);
                if (match)
                    match.eventBannerOrder = newOrder;
            }
        });
        this.events.set(updatedFullList);
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
            await this.firebaseService.delete('events', id);
            this.toastService.success('Event deleted successfully.');
        }
        catch (e) {
            this.toastService.error('Delete failed: ' + e.message);
        }
        finally {
            this.closeConfirmModal();
        }
    }
    async toggleArchive(event) {
        if (!this.authService.isAdmin())
            return;
        this.itemToArchive.set(event);
        this.showArchiveConfirmModal.set(true);
    }
    closeArchiveConfirmModal() {
        this.showArchiveConfirmModal.set(false);
        this.itemToArchive.set(null);
    }
    async confirmArchive() {
        const event = this.itemToArchive();
        if (!event)
            return;
        try {
            const newArchivedState = !event.isArchived;
            await this.firebaseService.update('events', event.id, { isArchived: newArchivedState });
            this.toastService.success(newArchivedState ? 'Event archived' : 'Event restored');
        }
        catch (e) {
            this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
        }
        finally {
            this.closeArchiveConfirmModal();
        }
    }
};
EventsComponent = __decorate([
    Component({
        selector: 'app-events',
        standalone: true,
        imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, EventDetailComponent],
        templateUrl: './events.component.html'
    })
], EventsComponent);
export { EventsComponent };
