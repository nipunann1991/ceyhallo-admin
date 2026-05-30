
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { AppEvent } from '../../models/event.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { EventDetailComponent } from './event-detail/event-detail.component';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, EventDetailComponent],
  templateUrl: './events.component.html'
})
export class EventsComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  
  events = signal<AppEvent[]>([]);
  searchQuery = signal('');

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  // Reorder State
  isReordering = signal(false);
  draggedIndex: number | null = null;

  // Location Data
  locations = signal<any[]>([]);
  
  // Selection
  selectedEvent = signal<AppEvent | null>(null);
  showArchived = signal(false);

  filteredEvents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const locs = this.locations();
    const archived = this.showArchived();
    let data = [...this.events()];

    // Map location data
    data = data.map(e => {
      const displayEvent = { ...e } as any;
      if (!displayEvent.countryCode && displayEvent.cityCode) {
        for (const c of locs) {
          const found = c.cities.find((cit: any) => cit.code === displayEvent.cityCode);
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

  paginatedEvents = computed(() => {
    const data = this.filteredEvents();
    if (this.isReordering()) {
      return data;
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  showArchiveConfirmModal = signal(false);
  itemToArchive = signal<AppEvent | null>(null);

  constructor() {}

  ngOnInit() {
    this.firebaseService.listenToPath<AppEvent>('events', (data) => {
      const sorted = data.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      this.events.set(sorted);
    });

    this.firebaseService.listenToPath<any>('countries', (data) => {
      const mappedLocations = data.map(country => {
        let citiesArray: {code: string, name: string}[] = [];
        if (country.cities) {
          if (Array.isArray(country.cities)) {
             citiesArray = country.cities;
          } else {
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

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  view(event: AppEvent) {
    this.selectedEvent.set(event);
  }

  closePanel() {
    this.selectedEvent.set(null);
  }

  copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      this.toastService.success('ID copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  async duplicate(item: AppEvent) {
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
        await this.firebaseService.create('events', newItem);
        this.toastService.success('Event duplicated as draft.');
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

    const displayList = [...this.filteredEvents()];
    const [draggedItem] = displayList.splice(this.draggedIndex, 1);
    displayList.splice(dropIndex, 0, draggedItem);

    const updates: Promise<void>[] = [];
    const updatedFullList = [...this.events()];

    displayList.forEach((item, index) => {
      const newOrder = index + 1;
      if (item.eventBannerOrder !== newOrder) {
        item.eventBannerOrder = newOrder;
        updates.push(this.firebaseService.update('events', item.id, { eventBannerOrder: newOrder }));
        
        // Optimistic update
        const match = updatedFullList.find(e => e.id === item.id);
        if (match) match.eventBannerOrder = newOrder;
      }
    });

    this.events.set(updatedFullList);
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
    const id = this.itemToDelete();
    if (!id) return;

    try {
      await this.firebaseService.delete('events', id);
      this.toastService.success('Event deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Delete failed: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }

  async toggleArchive(event: AppEvent) {
    if (!this.authService.isAdmin()) return;
    this.itemToArchive.set(event);
    this.showArchiveConfirmModal.set(true);
  }

  closeArchiveConfirmModal() {
    this.showArchiveConfirmModal.set(false);
    this.itemToArchive.set(null);
  }

  async confirmArchive() {
    const event = this.itemToArchive();
    if (!event) return;

    try {
      const newArchivedState = !event.isArchived;
      await this.firebaseService.update('events', event.id, { isArchived: newArchivedState });
      this.toastService.success(newArchivedState ? 'Event archived' : 'Event restored');
    } catch (e: any) {
      this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
    } finally {
      this.closeArchiveConfirmModal();
    }
  }
}
