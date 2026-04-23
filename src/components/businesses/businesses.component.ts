
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Business } from '../../models/business.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { BusinessDetailComponent } from './business-detail.component';
import { BusinessStateService } from '../../services/business-state.service';

@Component({
  selector: 'app-businesses',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, BusinessDetailComponent],
  templateUrl: './businesses.component.html'
})
export class BusinessesComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  businessStateService = inject(BusinessStateService);
  route = inject(ActivatedRoute);
  
  businesses = signal<Business[]>([]);
  searchQuery = this.businessStateService.searchQuery;
  categories = signal<any[]>([]);
  categoryFilter = this.businessStateService.selectedCategory;

  // Status Filters
  isFeaturedFilter = this.businessStateService.isFeaturedFilter;
  isVerifiedFilter = this.businessStateService.isVerifiedFilter;
  isPremiumFilter = this.businessStateService.isPremiumFilter;

  typeFilter = this.businessStateService.typeFilter;
  priceFilter = this.businessStateService.priceFilter;
  sortBy = this.businessStateService.sortBy;

  businessTypes = signal<string[]>(['restaurant', 'grocery', 'organizer']);

  // Pagination
  itemsPerPage = 10;
  currentPage = this.businessStateService.currentPage;

  // Location Data
  locations = signal<any[]>([]);
  
  // Selection
  selectedBusiness = signal<Business | null>(null);

  // Reorder State
  isReordering = signal(false);
  draggedIndex: number | null = null;

  filteredBusinesses = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.categoryFilter();
    const selectedCategory = this.categories().find(c => c.id === category);
    const categoryName = selectedCategory ? selectedCategory.name.toLowerCase() : '';

    const locs = this.locations();

    const sorted = [...this.businesses()].map(b => {
      const displayBiz = { ...b };
      if (!displayBiz.countryCode && displayBiz.cityCode) {
        const foundCountry = locs.find(c => c.cities.some((city: any) => city.code === displayBiz.cityCode));
        if (foundCountry) {
          displayBiz.countryCode = foundCountry.code;
        }
      }
      return displayBiz;
    }).sort((a, b) => (a.order || 9999) - (b.order || 9999));

    if (this.isReordering()) {
      return sorted.filter(b => {
        const matchesCategory = category === 'all' || (b.category && b.category.toLowerCase() === categoryName);
        return matchesCategory;
      });
    }

    return sorted.filter(b => {
      const type = this.typeFilter();
      const price = this.priceFilter();
      const isFeatured = this.isFeaturedFilter();
      const isVerified = this.isVerifiedFilter();
      const isPremium = this.isPremiumFilter();

      const matchesCategory = category === 'all' || (b.category && b.category.toLowerCase() === categoryName);
      const matchesType = type === 'all' || b.type === type;
      const matchesPrice = price === 'all' || b.priceRange === price;
      const matchesQuery = b.title?.toLowerCase().includes(query) || 
                         b.location?.toLowerCase().includes(query);
      const matchesFeatured = !isFeatured || b.isFeatured === true;
      const matchesVerified = !isVerified || b.isVerified === true;
      const matchesPremium = !isPremium || b.isPremium === true;
      return matchesCategory && matchesType && matchesPrice && matchesQuery && matchesFeatured && matchesVerified && matchesPremium;
    }).sort((a, b) => {
      if (this.sortBy() === 'order') {
        return (a.order || 9999) - (b.order || 9999);
      }
      if (this.sortBy() === 'newest') {
        return b.createdDate && a.createdDate ? b.createdDate.localeCompare(a.createdDate) : 0;
      }
      return a.title.localeCompare(b.title);
    });
  });

  paginatedBusinesses = computed(() => {
    const data = this.filteredBusinesses();
    if (this.isReordering()) {
      return data;
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  constructor() {
    if (this.businessStateService.selectedCategory() === null) {
      this.businessStateService.selectedCategory.set('all');
    }
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const query = params.get('q');
      const categoryName = params.get('category');
      const featured = params.get('featured');
      const verified = params.get('verified');
      const premium = params.get('premium');

      this.searchQuery.set(query ?? '');
      this.typeFilter.set('all');
      this.priceFilter.set('all');
      this.sortBy.set('newest');
      this.businessStateService.isFeaturedFilter.set(featured === 'true');
      this.businessStateService.isVerifiedFilter.set(verified === 'true');
      this.businessStateService.isPremiumFilter.set(premium === 'true');
      this.currentPage.set(1);

      if (categoryName) {
        this.updateCategoryFilterByValue(categoryName);
      } else {
        this.businessStateService.selectedCategory.set('all');
      }
    });

    this.firebaseService.listenToPath<Business>('businesses', (data) => {
      this.businesses.set(data);
    });

    this.firebaseService.listenToPath<any>('taxonomy_business', (data) => {
      const filteredData = data.filter((cat: any) => cat.name !== 'Popular' && cat.name !== 'Featured');
      this.categories.set(filteredData);
      const categoryName = this.route.snapshot.queryParamMap.get('category');
      if (categoryName) {
        this.updateCategoryFilterByValue(categoryName);
      }
      // Update businesses with categoryId
      this.businesses.update(currentBusinesses => currentBusinesses.map(biz => {
        const category = filteredData.find((cat: any) => cat.name === biz.category);
        return category ? { ...biz, categoryId: category.id } : biz;
      }));
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

  updateCategoryFilter(event: Event) {
    this.businessStateService.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  updateCategoryFilterByValue(categoryName: string) {
    const selectedCategory = this.categories().find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (selectedCategory) {
      this.businessStateService.selectedCategory.set(selectedCategory.id);
      this.currentPage.set(1);
    }
  }

  clearFilters() {
    this.searchQuery.set('');
    this.businessStateService.selectedCategory.set('all');
    this.typeFilter.set('all');
    this.priceFilter.set('all');
    this.sortBy.set('newest');
    this.businessStateService.isFeaturedFilter.set(false);
    this.businessStateService.isVerifiedFilter.set(false);
    this.businessStateService.isPremiumFilter.set(false);
    this.currentPage.set(1);
  }

  toggleFeaturedFilter(checked: boolean) {
    this.businessStateService.isFeaturedFilter.set(checked);
    this.currentPage.set(1);
  }

  toggleVerifiedFilter(checked: boolean) {
    this.businessStateService.isVerifiedFilter.set(checked);
    this.currentPage.set(1);
  }

  togglePremiumFilter(checked: boolean) {
    this.businessStateService.isPremiumFilter.set(checked);
    this.currentPage.set(1);
  }

  updateSortBy(event: Event) {
    this.sortBy.set((event.target as HTMLSelectElement).value);
  }

  view(biz: Business) {
    this.selectedBusiness.set(biz);
  }

  closePanel() {
    this.selectedBusiness.set(null);
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
    if (!this.authService.isAdmin()) return;
    this.isReordering.update(v => !v);
    if (this.isReordering()) {
      this.sortBy.set('order');
    }
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

    const displayList = [...this.filteredBusinesses()];
    const [draggedItem] = displayList.splice(this.draggedIndex, 1);
    displayList.splice(dropIndex, 0, draggedItem);

    // Prepare updates
    const updates: Promise<void>[] = [];
    const fullList = [...this.businesses()];
    
    displayList.forEach((item, index) => {
      const newOrder = index + 1;
      if (item.order !== newOrder) {
        // Optimistic update
        item.order = newOrder;
        
        // Push update
        updates.push(this.firebaseService.update('businesses', item.id, { order: newOrder }));
        
        // Update local full list ref
        const match = fullList.find(o => o.id === item.id);
        if (match) match.order = newOrder;
      }
    });
    
    this.businesses.set(fullList);
    this.draggedIndex = null;

    try {
      await Promise.all(updates);
      this.toastService.success('Businesses order saved');
    } catch (e) {
      console.error(e);
      this.toastService.error('Failed to save order');
    }
  }

  async duplicate(item: Business) {
    if (!this.authService.isAdmin()) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = item;
    const newItem = {
      ...data,
      title: `${data.title} (Copy)`,
      isPublished: false,
      rating: 0,
      reviews: 0,
      isVerified: false,
      isFeatured: false,
      isPremium: false,
      createdDate: new Date().toISOString()
    };

    try {
      await this.firebaseService.create('businesses', newItem);
      this.toastService.success('Business duplicated as draft.');
    } catch (e: any) {
      this.toastService.error('Duplicate failed: ' + e.message);
    }
  }

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
      await this.firebaseService.delete('businesses', id);
      this.toastService.success('Business deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Delete failed: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }
}
