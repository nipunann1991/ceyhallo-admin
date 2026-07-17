import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Job } from '../../models/job.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { JobDetailComponent } from './job-detail/job-detail.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, JobDetailComponent],
  templateUrl: './jobs.component.html'
})
export class JobsComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  
  jobs = signal<Job[]>([]);
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
  selectedJob = signal<Job | null>(null);
  showArchived = signal(false);

  filteredJobs = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const locs = this.locations();
    const archived = this.showArchived();
    let data = [...this.jobs()];

    // Map location data
    data = data.map(j => {
      // Derive country code if missing
      const displayJob = { ...j };
      if (!displayJob.countryCode && displayJob.cityCode) {
        const foundCountry = locs.find(c => c.cities.some((city: any) => city.code === displayJob.cityCode));
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

  paginatedJobs = computed(() => {
    const data = this.filteredJobs();
    if (this.isReordering()) {
      return data;
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  showArchiveConfirmModal = signal(false);
  itemToArchive = signal<Job | null>(null);

  constructor() {}

  ngOnInit() {
    this.firebaseService.listenToPath<Job>('jobs', (data) => {
      // Sort by postedDate descending by default
      const sorted = data.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
      this.jobs.set(sorted);
    });

    // Fetch Locations
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

  view(job: Job) {
    this.selectedJob.set(job);
  }

  closePanel() {
    this.selectedJob.set(null);
  }

  copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      this.toastService.success('ID copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
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

    const displayList = [...this.filteredJobs()];
    const [draggedItem] = displayList.splice(this.draggedIndex, 1);
    displayList.splice(dropIndex, 0, draggedItem);

    const updates: Promise<void>[] = [];
    const updatedFullList = [...this.jobs()];

    displayList.forEach((item, index) => {
      const newOrder = index + 1;
      if (item.featuredOrder !== newOrder) {
        item.featuredOrder = newOrder;
        updates.push(this.firebaseService.update('jobs', item.id, { featuredOrder: newOrder }));
        
        // Optimistic update
        const match = updatedFullList.find(j => j.id === item.id);
        if (match) match.featuredOrder = newOrder;
      }
    });

    this.jobs.set(updatedFullList);
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
    if (!this.authService.isAdmin()) {
      this.closeConfirmModal();
      return;
    }
    const id = this.itemToDelete();
    if (!id) return;

    try {
      await this.firebaseService.delete('jobs', id);
      this.toastService.success('Job deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Delete failed: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }

  async toggleArchive(job: Job) {
    if (!this.authService.canManageContent()) return;
    this.itemToArchive.set(job);
    this.showArchiveConfirmModal.set(true);
  }

  closeArchiveConfirmModal() {
    this.showArchiveConfirmModal.set(false);
    this.itemToArchive.set(null);
  }

  async confirmArchive() {
    const job = this.itemToArchive();
    if (!job) return;

    try {
      const newArchivedState = !job.isArchived;
      await this.firebaseService.update('jobs', job.id, { isArchived: newArchivedState });
      this.toastService.success(newArchivedState ? 'Job archived' : 'Job restored');
    } catch (e: any) {
      this.toastService.error('Failed to update archive state: ' + (e.message || 'Unknown error'));
    } finally {
      this.closeArchiveConfirmModal();
    }
  }
}
