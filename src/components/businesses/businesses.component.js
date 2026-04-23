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
import { BusinessDetailComponent } from './business-detail.component';
import { BusinessStateService } from '../../services/business-state.service';
let BusinessesComponent = class BusinessesComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.businessStateService = inject(BusinessStateService);
        this.route = inject(ActivatedRoute);
        this.businesses = signal([]);
        this.searchQuery = this.businessStateService.searchQuery;
        this.categories = signal([]);
        this.categoryFilter = this.businessStateService.selectedCategory;
        // Status Filters
        this.isFeaturedFilter = this.businessStateService.isFeaturedFilter;
        this.isVerifiedFilter = this.businessStateService.isVerifiedFilter;
        this.isPremiumFilter = this.businessStateService.isPremiumFilter;
        this.typeFilter = this.businessStateService.typeFilter;
        this.priceFilter = this.businessStateService.priceFilter;
        this.sortBy = this.businessStateService.sortBy;
        this.businessTypes = signal(['restaurant', 'grocery', 'organizer']);
        // Pagination
        this.itemsPerPage = 10;
        this.currentPage = this.businessStateService.currentPage;
        // Location Data
        this.locations = signal([]);
        // Selection
        this.selectedBusiness = signal(null);
        // Reorder State
        this.isReordering = signal(false);
        this.draggedIndex = null;
        this.filteredBusinesses = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const category = this.categoryFilter();
            const selectedCategory = this.categories().find(c => c.id === category);
            const categoryName = selectedCategory ? selectedCategory.name.toLowerCase() : '';
            const locs = this.locations();
            const sorted = [...this.businesses()].map(b => {
                const displayBiz = { ...b };
                if (!displayBiz.countryCode && displayBiz.cityCode) {
                    const foundCountry = locs.find(c => c.cities.some((city) => city.code === displayBiz.cityCode));
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
        this.paginatedBusinesses = computed(() => {
            const data = this.filteredBusinesses();
            if (this.isReordering()) {
                return data;
            }
            const start = (this.currentPage() - 1) * this.itemsPerPage;
            return data.slice(start, start + this.itemsPerPage);
        });
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
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
            }
            else {
                this.businessStateService.selectedCategory.set('all');
            }
        });
        this.firebaseService.listenToPath('businesses', (data) => {
            this.businesses.set(data);
        });
        this.firebaseService.listenToPath('taxonomy_business', (data) => {
            const filteredData = data.filter((cat) => cat.name !== 'Popular' && cat.name !== 'Featured');
            this.categories.set(filteredData);
            const categoryName = this.route.snapshot.queryParamMap.get('category');
            if (categoryName) {
                this.updateCategoryFilterByValue(categoryName);
            }
            // Update businesses with categoryId
            this.businesses.update(currentBusinesses => currentBusinesses.map(biz => {
                const category = filteredData.find((cat) => cat.name === biz.category);
                return category ? { ...biz, categoryId: category.id } : biz;
            }));
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
    updateCategoryFilter(event) {
        this.businessStateService.selectedCategory.set(event.target.value);
        this.currentPage.set(1);
    }
    updateCategoryFilterByValue(categoryName) {
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
    toggleFeaturedFilter(checked) {
        this.businessStateService.isFeaturedFilter.set(checked);
        this.currentPage.set(1);
    }
    toggleVerifiedFilter(checked) {
        this.businessStateService.isVerifiedFilter.set(checked);
        this.currentPage.set(1);
    }
    togglePremiumFilter(checked) {
        this.businessStateService.isPremiumFilter.set(checked);
        this.currentPage.set(1);
    }
    updateSortBy(event) {
        this.sortBy.set(event.target.value);
    }
    view(biz) {
        this.selectedBusiness.set(biz);
    }
    closePanel() {
        this.selectedBusiness.set(null);
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
        if (this.isReordering()) {
            this.sortBy.set('order');
        }
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
        const displayList = [...this.filteredBusinesses()];
        const [draggedItem] = displayList.splice(this.draggedIndex, 1);
        displayList.splice(dropIndex, 0, draggedItem);
        // Prepare updates
        const updates = [];
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
                if (match)
                    match.order = newOrder;
            }
        });
        this.businesses.set(fullList);
        this.draggedIndex = null;
        try {
            await Promise.all(updates);
            this.toastService.success('Businesses order saved');
        }
        catch (e) {
            console.error(e);
            this.toastService.error('Failed to save order');
        }
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
        }
        catch (e) {
            this.toastService.error('Duplicate failed: ' + e.message);
        }
    }
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
            await this.firebaseService.delete('businesses', id);
            this.toastService.success('Business deleted successfully.');
        }
        catch (e) {
            this.toastService.error('Delete failed: ' + e.message);
        }
        finally {
            this.closeConfirmModal();
        }
    }
};
BusinessesComponent = __decorate([
    Component({
        selector: 'app-businesses',
        standalone: true,
        imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, BusinessDetailComponent],
        templateUrl: './businesses.component.html'
    })
], BusinessesComponent);
export { BusinessesComponent };
