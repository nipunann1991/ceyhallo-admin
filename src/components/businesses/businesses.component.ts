
import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import * as XLSX from 'xlsx';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Business } from '../../models/business.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { BusinessDetailComponent } from './business-detail/business-detail.component';
import { BusinessAdminActions } from '../../store/business-admin.actions';
import {
  selectBusinessCategoryFilter,
  selectBusinessCurrentPage,
  selectBusinessIsFeaturedFilter,
  selectBusinessIsPremiumFilter,
  selectBusinessIsVerifiedFilter,
  selectBusinessPriceFilter,
  selectBusinessSearchQuery,
  selectBusinessSortBy,
  selectBusinessTypeFilter
} from '../../store/business-admin.selectors';
import { BusinessAdminState, BusinessSortOption } from '../../store/business-admin.state';
import { ReferralCodeService } from '../../services/referral-code.service';

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
  referralCodeService = inject(ReferralCodeService);
  private store = inject(Store);
  route = inject(ActivatedRoute);

  @HostListener('document:click', ['$event'])
  closeDropdownsOnOutsideClick(event: MouseEvent) {
    const target = event.target as Node;
    document.querySelectorAll<HTMLDetailsElement>('app-businesses details[open]').forEach((dropdown) => {
      if (!dropdown.contains(target)) dropdown.removeAttribute('open');
    });
  }
  
  businesses = signal<Business[]>([]);
  searchQuery = this.store.selectSignal(selectBusinessSearchQuery);
  categories = signal<any[]>([]);
  categoryFilter = this.store.selectSignal(selectBusinessCategoryFilter);

  // Status Filters
  isFeaturedFilter = this.store.selectSignal(selectBusinessIsFeaturedFilter);
  isVerifiedFilter = this.store.selectSignal(selectBusinessIsVerifiedFilter);
  isPremiumFilter = this.store.selectSignal(selectBusinessIsPremiumFilter);

  typeFilter = this.store.selectSignal(selectBusinessTypeFilter);
  priceFilter = this.store.selectSignal(selectBusinessPriceFilter);
  sortBy = this.store.selectSignal(selectBusinessSortBy);
  hasActiveFilters = computed(() =>
    this.categoryFilter() !== 'all' ||
    this.sortBy() !== 'title-asc' ||
    this.isFeaturedFilter() ||
    this.isVerifiedFilter() ||
    this.isPremiumFilter()
  );

  businessTypes = signal<string[]>(['restaurant', 'grocery', 'organizer']);
  sortOptions: Array<{ value: BusinessSortOption; label: string }> = [
    { value: 'title-asc', label: 'Business A-Z' },
    { value: 'title-desc', label: 'Business Z-A' },
    { value: 'alphabetical-sort-key', label: 'A-Z sort key' },
    { value: 'category-order', label: 'Category order' },
    { value: 'category-order-desc', label: 'Category order reversed' },
    { value: 'category-sort-id', label: 'Category sort ID' },
    { value: 'featured-sort-id', label: 'Featured sort ID' },
    { value: 'category-asc', label: 'Category A-Z' },
    { value: 'category-desc', label: 'Category Z-A' },
    { value: 'order', label: 'Manual business order' },
    { value: 'rating-desc', label: 'Rating high-low' },
    { value: 'rating-asc', label: 'Rating low-high' }
  ];

  // Pagination
  itemsPerPage = signal(10);
  currentPage = this.store.selectSignal(selectBusinessCurrentPage);

  // Location Data
  locations = signal<any[]>([]);
  
  // Selection
  selectedBusiness = signal<Business | null>(null);
  selectedBusinessIds = signal<string[]>([]);

  // Reorder State
  isReordering = signal(false);
  draggedIndex: number | null = null;
  reorderMode = computed<'category' | 'featured' | 'manual'>(() => {
    if (this.isFeaturedFilter()) return 'featured';
    if (this.categoryFilter() !== 'all') return 'category';
    return 'manual';
  });
  reorderLabel = computed(() => {
    if (this.reorderMode() === 'featured') return 'Featured order';
    if (this.reorderMode() === 'category') return 'Category order';
    return 'Manual order';
  });

  filteredBusinesses = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.categoryFilter();
    const selectedCategory = this.categories().find(c => c.id === category);
    const categoryName = selectedCategory ? selectedCategory.name.toLowerCase() : '';

    const locs = this.locations();

    const displayBusinesses = [...this.businesses()].map(b => {
      const displayBiz = { ...b };
      if (!displayBiz.countryCode && displayBiz.cityCode) {
        const foundCountry = locs.find(c => c.cities.some((city: any) => city.code === displayBiz.cityCode));
        if (foundCountry) {
          displayBiz.countryCode = foundCountry.code;
        }
      }
      return displayBiz;
    });

    if (this.isReordering()) {
      return displayBusinesses.filter(b => {
        const matchesCategory = category === 'all' || (b.category && b.category.toLowerCase() === categoryName);
        const matchesFeatured = this.reorderMode() !== 'featured' || b.isFeatured === true;
        return matchesCategory && matchesFeatured;
      }).sort((a, b) => this.compareActiveReorderField(a, b));
    }

    return displayBusinesses.filter(b => {
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
      const sort = this.sortBy();
      if (sort === 'order') {
        return this.compareBusinessManualOrder(a, b);
      }
      if (sort === 'alphabetical-sort-key') {
        return this.compareAlphabeticalSortKey(a, b);
      }
      if (sort === 'category-sort-id') {
        return this.compareCategorySortId(a, b);
      }
      if (sort === 'featured-sort-id') {
        return this.compareFeaturedSortId(a, b);
      }
      if (sort === 'category-order' || sort === 'category-order-desc') {
        const direction = sort === 'category-order-desc' ? -1 : 1;
        return this.compareCategoryOrder(a, b) * direction || this.compareBusinessTitle(a, b);
      }
      const [column, direction] = sort.split('-');
      const multiplier = direction === 'desc' ? -1 : 1;
      const value = (business: Business): string | number => {
        if (column === 'category') return business.category || '';
        if (column === 'phone') return business.contact?.phones?.[0] || (business.contact as any)?.phone || '';
        if (column === 'rating') return business.rating || 0;
        if (column === 'state') return business.isArchived ? 'Archived' : (business.isPublished ? 'Published' : 'Draft');
        return this.getAlphabeticalSortKey(business);
      };
      const left = value(a);
      const right = value(b);
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier;
      return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
    });
  });

  paginatedBusinesses = computed(() => {
    const data = this.filteredBusinesses();
    if (this.isReordering()) {
      return data;
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  selectedBusinesses = computed(() => {
    const selectedIds = new Set(this.selectedBusinessIds());
    return this.filteredBusinesses().filter((business) => selectedIds.has(business.id));
  });

  allFilteredSelected = computed(() => {
    const filtered = this.filteredBusinesses();
    const selectedIds = new Set(this.selectedBusinessIds());
    return filtered.length > 0 && filtered.every((business) => selectedIds.has(business.id));
  });

  selectionLabel = computed(() => {
    const selectedCount = this.selectedBusinessIds().length;
    const filteredCount = this.filteredBusinesses().length;
    return selectedCount > 0 ? `${selectedCount} selected` : `${filteredCount} records`;
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);
  showArchiveConfirmModal = signal(false);
  archiveTargetIds = signal<string[]>([]);
  archiveMode = signal<'archive' | 'unarchive'>('archive');
  isImporting = signal(false);

  exportButtonLabel = computed(() =>
    this.selectedBusinessIds().length > 0 ? 'Export Selected to Excel' : 'Export to Excel'
  );

  archiveActionLabel = computed(() => {
    const selectedIds = new Set(this.selectedBusinessIds());
    const selected = this.businesses().filter((business) => selectedIds.has(business.id));
    return selected.length > 0 && selected.every((business) => business.isArchived)
      ? 'Unarchive Selected'
      : 'Archive Selected';
  });

  ngOnInit() {
    this.initializeQueryFilters();
    this.loadBusinesses();
    this.loadTaxonomies();
    this.loadCountries();
  }

  private initializeQueryFilters() {
    this.route.queryParamMap.subscribe((params) => {
      const query = params.get('q');
      const categoryName = params.get('category');
      const categoryId = params.get('categoryId');
      const requestedPage = Number(params.get('page'));
      const featured = params.get('featured');
      const verified = params.get('verified');
      const premium = params.get('premium');

      const hasQueryFilters = [query, categoryName, categoryId, featured, verified, premium]
        .some((value) => value !== null);
      if (!hasQueryFilters) return;

      if (query !== null || categoryName !== null || featured !== null || verified !== null || premium !== null) {
        this.updateBusinessFilters({
          searchQuery: query ?? '',
          typeFilter: 'all',
          priceFilter: 'all',
          sortBy: 'title-asc',
          isFeaturedFilter: featured === 'true',
          isVerifiedFilter: verified === 'true',
          isPremiumFilter: premium === 'true'
        });
      }

      if (categoryId) {
        this.updateBusinessFilters({
          selectedCategory: categoryId,
          sortBy: 'category-sort-id'
        });
      } else if (categoryName) {
        this.updateCategoryFilterByValue(categoryName);
      } else if (query !== null || featured !== null || verified !== null || premium !== null) {
        this.updateBusinessFilters({ selectedCategory: 'all' });
      }

      this.updateBusinessFilters({ currentPage: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1 });
    });
  }

  private updateBusinessFilters(filters: Partial<BusinessAdminState>) {
    this.store.dispatch(BusinessAdminActions.updateFilters({ filters }));
  }

  private compareBusinessManualOrder(a: Business, b: Business) {
    return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
      || this.compareBusinessTitle(a, b);
  }

  private compareActiveReorderField(a: Business, b: Business) {
    if (this.reorderMode() === 'featured') {
      return this.compareFeaturedSortId(a, b);
    }
    if (this.reorderMode() === 'category') {
      return this.compareCategorySortId(a, b);
    }
    return this.compareBusinessManualOrder(a, b);
  }

  private compareAlphabeticalSortKey(a: Business, b: Business) {
    return this.getAlphabeticalSortKey(a).localeCompare(this.getAlphabeticalSortKey(b), undefined, { numeric: true, sensitivity: 'base' })
      || this.compareBusinessTitle(a, b);
  }

  private compareCategorySortId(a: Business, b: Business) {
    return (a.categorySortId ?? a.order ?? Number.MAX_SAFE_INTEGER) - (b.categorySortId ?? b.order ?? Number.MAX_SAFE_INTEGER)
      || this.compareBusinessTitle(a, b);
  }

  private compareFeaturedSortId(a: Business, b: Business) {
    return (a.featuredSortId ?? Number.MAX_SAFE_INTEGER) - (b.featuredSortId ?? Number.MAX_SAFE_INTEGER)
      || this.compareBusinessTitle(a, b);
  }

  private compareCategoryOrder(a: Business, b: Business) {
    return this.getCategoryOrder(a) - this.getCategoryOrder(b);
  }

  private compareBusinessTitle(a: Business, b: Business) {
    return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
  }

  private getAlphabeticalSortKey(business: Business) {
    return String(business.alphabeticalSortKey || business.title || '').trim().toLocaleLowerCase();
  }

  private getCategoryOrder(business: Business) {
    const normalizedCategory = business.category?.toLowerCase() || '';
    const category = this.categories().find((item) =>
      item.id === business.categoryId || item.name?.toLowerCase() === normalizedCategory
    );
    return category?.order ?? Number.MAX_SAFE_INTEGER;
  }

  private loadBusinesses() {
    this.firebaseService.listenToPath<Business>('businesses', (data) => {
      this.businesses.set(data);
    });
  }

  private loadTaxonomies() {
    this.firebaseService.listenToPath<any>('taxonomy_business', (data) => {
      const filteredData = data
        .filter((cat: any) => cat.name !== 'Popular' && cat.name !== 'Featured')
        .sort((a: any, b: any) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
          || String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
      this.categories.set(filteredData);
      const categoryName = this.route.snapshot.queryParamMap.get('category');
      if (categoryName) {
        this.updateCategoryFilterByValue(categoryName);
      }
      this.businesses.update(currentBusinesses => currentBusinesses.map(biz => {
        const category = filteredData.find((cat: any) => cat.name === biz.category);
        return category ? { ...biz, categoryId: category.id } : biz;
      }));
    });
  }

  private loadCountries() {
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
    this.updateBusinessFilters({
      searchQuery: (event.target as HTMLInputElement).value,
      currentPage: 1
    });
  }

  getBusinessCity(business: Business) {
    const cityCode = business.cityCode || business.locations?.find(location => location.isPrimary)?.cityCode;
    if (!cityCode) return 'City not set';
    for (const country of this.locations()) {
      const city = country.cities?.find((item: { code: string; name: string }) => item.code === cityCode);
      if (city) return city.name;
    }
    return cityCode;
  }

  updateCurrentPage(page: number) {
    this.updateBusinessFilters({ currentPage: page });
  }

  updateCategoryFilter(event: Event) {
    const selectedCategory = (event.target as HTMLSelectElement).value;
    this.updateBusinessFilters({
      selectedCategory,
      sortBy: selectedCategory === 'all' ? 'title-asc' : 'category-sort-id',
      currentPage: 1
    });
  }

  updateSort(event: Event) {
    this.updateBusinessFilters({
      sortBy: (event.target as HTMLSelectElement).value as BusinessSortOption,
      currentPage: 1
    });
  }

  updateCategoryFilterByValue(categoryName: string) {
    const selectedCategory = this.categories().find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (selectedCategory) {
      this.updateBusinessFilters({
        selectedCategory: selectedCategory.id,
        sortBy: 'category-sort-id',
        currentPage: 1
      });
    }
  }

  businessReturnQueryParams() {
    const categoryId = this.categoryFilter();
    return {
      categoryId: categoryId && categoryId !== 'all' ? categoryId : null,
      page: this.currentPage() > 1 ? this.currentPage() : null
    };
  }

  clearFilters() {
    this.store.dispatch(BusinessAdminActions.clearFilters());
  }

  toggleBusinessSelection(id: string, checked: boolean) {
    this.selectedBusinessIds.update((current) => {
      const selected = new Set(current);
      if (checked) {
        selected.add(id);
      } else {
        selected.delete(id);
      }
      return Array.from(selected);
    });
  }

  toggleSelectAllFiltered(checked: boolean) {
    if (!checked) {
      this.selectedBusinessIds.set([]);
      return;
    }

    this.selectedBusinessIds.set(this.filteredBusinesses().map((business) => business.id));
  }

  isBusinessSelected(id: string) {
    return this.selectedBusinessIds().includes(id);
  }

  exportBusinessesToExcel() {
    const selectedIds = new Set(this.selectedBusinessIds());
    const rows = selectedIds.size > 0
      ? this.businesses().filter((business) => selectedIds.has(business.id))
      : this.businesses();
    if (rows.length === 0) {
      this.toastService.error('No businesses to export.');
      return;
    }

    const headers = [
      'id', 'title', 'description', 'category', 'categoryId', 'type', 'priceRange',
      'location', 'countryCode', 'cityCode', 'googlePlaceId', 'rating', 'reviews',
      'contactPhones', 'contactEmail', 'contactWebsite', 'contactInstagram',
      'contactFacebook', 'contactTiktok', 'imageUrl', 'logoUrl', 'menuUrl',
      'gallery', 'services', 'openingHours', 'locations', 'deliveryInfo', 'isPublished',
      'isArchived', 'isPremium', 'isVerified', 'isFeatured', 'isDeliveryAvailable',
      'actionType', 'actionTarget', 'alphabeticalSortKey', 'categorySortId', 'featuredSortId',
      'order', 'createdDate', 'publishedDate', 'additionalData'
    ];
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((business) => this.toBusinessExportRow(business)),
      { header: headers }
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Businesses');
    const date = new Date().toISOString().slice(0, 10);
    const filePrefix = selectedIds.size > 0 ? 'selected-businesses' : 'businesses';
    XLSX.writeFileXLSX(workbook, `${filePrefix}-${date}.xlsx`, { compression: true });
    this.toastService.success(`Exported ${rows.length} business${rows.length === 1 ? '' : 'es'}.`);
  }

  async importBusinessesFromExcel(event: Event) {
    if (!this.authService.canManageContent()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting.set(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('The workbook does not contain a worksheet.');

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
        defval: '',
        raw: false
      });
      if (rows.length === 0) throw new Error('The worksheet does not contain any business rows.');

      const invalidRows: number[] = [];
      const operations: Array<{ id?: string; data: Record<string, unknown> }> = [];
      let unchanged = 0;
      const existingBusinesses = this.businesses();

      rows.forEach((row, index) => {
        const imported = this.toImportedBusiness(row);
        if (!imported.title || !imported.category || !imported.location) {
          invalidRows.push(index + 2);
          return;
        }

        const existing = this.findExistingBusiness(row, imported, existingBusinesses);
        if (!existing && !imported['createdDate']) {
          imported['createdDate'] = new Date().toISOString();
        }
        const changes = existing ? this.getChangedFields(existing, imported) : imported;
        if (existing && Object.keys(changes).length === 0) {
          unchanged += 1;
          return;
        }

        operations.push({ id: existing?.id, data: changes });
      });

      if (invalidRows.length > 0) {
        throw new Error(`Rows ${invalidRows.join(', ')} must include title, category, and location.`);
      }

      if (operations.length === 0) {
        this.toastService.success(`No changes found. ${unchanged} business${unchanged === 1 ? '' : 'es'} already match the spreadsheet.`);
        return;
      }

      const result = await this.firebaseService.saveMany('businesses', operations);
      const summary = [
        result.created ? `${result.created} created` : '',
        result.updated ? `${result.updated} updated` : '',
        unchanged ? `${unchanged} unchanged` : ''
      ].filter(Boolean).join(', ');
      this.toastService.success(`Import complete: ${summary}.`);
    } catch (error: any) {
      this.toastService.error('Import failed: ' + (error?.message || 'Unable to read the Excel file.'));
    } finally {
      input.value = '';
      this.isImporting.set(false);
    }
  }

  private findExistingBusiness(row: Record<string, unknown>, imported: Record<string, unknown>, businesses: Business[]) {
    const spreadsheetId = this.stringCell(row['id']);
    if (spreadsheetId) {
      const byId = businesses.find((business) => business.id === spreadsheetId);
      if (byId) return byId;
    }

    const googlePlaceId = this.stringCell(imported['googlePlaceId']);
    if (googlePlaceId) {
      const byPlaceId = businesses.find((business) => business.googlePlaceId === googlePlaceId);
      if (byPlaceId) return byPlaceId;
    }

    const fingerprint = this.businessFingerprint(imported);
    return businesses.find((business) => this.businessFingerprint(business as unknown as Record<string, unknown>) === fingerprint);
  }

  private getChangedFields(existing: Business, imported: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(imported).filter(([key, value]) => !this.isSameImportValue(existing[key as keyof Business], value))
    );
  }

  private businessFingerprint(value: Record<string, unknown>) {
    return [value['title'], value['location'], value['countryCode'], value['cityCode']]
      .map((item) => this.stringCell(item).toLocaleLowerCase())
      .join('|');
  }

  private isSameImportValue(current: unknown, incoming: unknown) {
    return this.stableJson(current) === this.stableJson(incoming);
  }

  private stableJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((item) => this.stableJson(item)).join(',')}]`;
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${this.stableJson(record[key])}`).join(',')}}`;
    }
    return JSON.stringify(value) ?? 'undefined';
  }

  private toBusinessExportRow(business: Business) {
    const data = business as Business & Record<string, unknown>;
    const knownFields = new Set([
      'id', 'title', 'description', 'category', 'categoryId', 'type', 'priceRange',
      'location', 'countryCode', 'cityCode', 'googlePlaceId', 'rating', 'reviews',
      'contact', 'imageUrl', 'logoUrl', 'menuUrl', 'gallery', 'services', 'openingHours',
      'locations', 'deliveryInfo', 'isPublished', 'isArchived', 'isPremium', 'isVerified',
      'isFeatured', 'isDeliveryAvailable', 'actionType', 'actionTarget', 'alphabeticalSortKey',
      'categorySortId', 'featuredSortId', 'order', 'createdDate', 'publishedDate'
    ]);
    const additionalData = Object.fromEntries(
      Object.entries(data).filter(([key]) => !knownFields.has(key))
    );

    return {
      id: business.id || '',
      title: business.title || '',
      description: this.stripHtml(business.description),
      category: business.category || '',
      categoryId: business.categoryId || '',
      type: business.type || '',
      priceRange: business.priceRange || '',
      location: business.location || '',
      countryCode: business.countryCode || '',
      cityCode: business.cityCode || '',
      googlePlaceId: business.googlePlaceId || '',
      rating: business.rating ?? '',
      reviews: business.reviews ?? '',
      contactPhones: JSON.stringify(business.contact?.phones || []),
      contactEmail: (business.contact as any)?.email || '',
      contactWebsite: business.contact?.website || '',
      contactInstagram: business.contact?.instagram || '',
      contactFacebook: business.contact?.facebook || '',
      contactTiktok: business.contact?.tiktok || '',
      imageUrl: business.imageUrl || '',
      logoUrl: business.logoUrl || '',
      menuUrl: business.menuUrl || '',
      gallery: JSON.stringify(business.gallery || []),
      services: JSON.stringify(business.services || []),
      openingHours: JSON.stringify(business.openingHours || []),
      locations: JSON.stringify(business.locations || []),
      deliveryInfo: JSON.stringify(business.deliveryInfo || []),
      isPublished: business.isPublished ?? false,
      isArchived: business.isArchived ?? false,
      isPremium: business.isPremium ?? false,
      isVerified: business.isVerified ?? false,
      isFeatured: business.isFeatured ?? false,
      isDeliveryAvailable: business.isDeliveryAvailable ?? false,
      actionType: business.actionType || '',
      actionTarget: business.actionTarget || '',
      alphabeticalSortKey: business.alphabeticalSortKey || this.getAlphabeticalSortKey(business),
      categorySortId: business.categorySortId ?? '',
      featuredSortId: business.featuredSortId ?? '',
      order: business.order ?? '',
      createdDate: business.createdDate || '',
      publishedDate: business.publishedDate || '',
      additionalData: Object.keys(additionalData).length ? JSON.stringify(additionalData) : ''
    };
  }

  private toImportedBusiness(row: Record<string, unknown>) {
    const additionalData = this.parseJsonCell(row['additionalData'], {});
    const contactEmail = this.stringCell(row['contactEmail']);
    const business = {
      ...(this.isPlainObject(additionalData) ? additionalData : {}),
      title: this.stringCell(row['title']),
      description: this.toRichTextDescription(this.stringCell(row['description'])),
      category: this.stringCell(row['category']),
      categoryId: this.optionalStringCell(row['categoryId']),
      type: this.stringCell(row['type']),
      priceRange: this.stringCell(row['priceRange']),
      location: this.stringCell(row['location']),
      imageUrl: this.stringCell(row['imageUrl']),
      logoUrl: this.stringCell(row['logoUrl']),
      menuUrl: this.stringCell(row['menuUrl']),
      googlePlaceId: this.stringCell(row['googlePlaceId']),
      rating: this.numberCell(row['rating']),
      reviews: this.numberCell(row['reviews']),
      countryCode: this.stringCell(row['countryCode']),
      cityCode: this.stringCell(row['cityCode']),
      contact: {
        phones: this.stringArrayCell(row['contactPhones']),
        website: this.stringCell(row['contactWebsite']),
        instagram: this.stringCell(row['contactInstagram']),
        facebook: this.stringCell(row['contactFacebook']),
        tiktok: this.stringCell(row['contactTiktok']),
        ...(contactEmail ? { email: contactEmail } : {})
      },
      gallery: this.stringArrayCell(row['gallery']),
      services: this.stringArrayCell(row['services']),
      openingHours: this.openingHoursCell(row['openingHours']),
      locations: this.locationsCell(row['locations']),
      deliveryInfo: this.deliveryInfoCell(row['deliveryInfo']),
      isPublished: this.booleanCell(row['isPublished']),
      isArchived: this.booleanCell(row['isArchived']),
      isPremium: this.booleanCell(row['isPremium']),
      isVerified: this.booleanCell(row['isVerified']),
      isFeatured: this.booleanCell(row['isFeatured']),
      isDeliveryAvailable: this.booleanCell(row['isDeliveryAvailable']),
      actionType: this.stringCell(row['actionType']),
      actionTarget: this.stringCell(row['actionTarget']),
      alphabeticalSortKey: this.optionalStringCell(row['alphabeticalSortKey']) || this.stringCell(row['title']).toLocaleLowerCase(),
      categorySortId: this.optionalNumberCell(row['categorySortId']),
      featuredSortId: this.optionalNumberCell(row['featuredSortId']),
      order: this.optionalNumberCell(row['order']),
      createdDate: this.optionalStringCell(row['createdDate']),
      publishedDate: this.optionalStringCell(row['publishedDate'])
    };

    return Object.fromEntries(Object.entries(business).filter(([, value]) => value !== undefined));
  }

  private stringCell(value: unknown) {
    return String(value ?? '').trim();
  }

  private numberCell(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private optionalNumberCell(value: unknown) {
    const text = this.stringCell(value);
    return text === '' ? undefined : this.numberCell(value);
  }

  private optionalStringCell(value: unknown) {
    return this.stringCell(value) || undefined;
  }

  private booleanCell(value: unknown) {
    return value === true || value === 1 || ['true', 'yes', '1'].includes(this.stringCell(value).toLowerCase());
  }

  private parseJsonCell<T>(value: unknown, fallback: T): T {
    if (!value || typeof value !== 'string') return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private stringArrayCell(value: unknown) {
    const parsed = this.parseJsonCell<unknown[]>(value, []);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  }

  private openingHoursCell(value: unknown) {
    const parsed = this.parseJsonCell<Array<Record<string, unknown>>>(value, []);
    return Array.isArray(parsed)
      ? parsed.map((item) => ({ day: this.stringCell(item.day), hours: this.stringCell(item.hours) }))
      : [];
  }

  private locationsCell(value: unknown) {
    const parsed = this.parseJsonCell<Array<Record<string, unknown>>>(value, []);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      isPrimary: this.booleanCell(item.isPrimary),
      location: this.stringCell(item.location),
      ...(this.optionalStringCell(item.mapQuery) ? { mapQuery: this.optionalStringCell(item.mapQuery) } : {}),
      ...(item.useBusinessNameForMap !== undefined ? { useBusinessNameForMap: this.booleanCell(item.useBusinessNameForMap) } : {}),
      googlePlaceId: this.stringCell(item.googlePlaceId),
      rating: this.numberCell(item.rating),
      reviews: this.numberCell(item.reviews),
      countryCode: this.stringCell(item.countryCode),
      cityCode: this.stringCell(item.cityCode),
      phones: this.stringArrayValue(item.phones),
      openingHours: this.openingHoursValue(item.openingHours)
    }));
  }

  private deliveryInfoCell(value: unknown) {
    const parsed = this.parseJsonCell<Array<Record<string, unknown>>>(value, []);
    return Array.isArray(parsed)
      ? parsed.map((item) => ({ location: this.stringCell(item.location), charge: this.stringCell(item.charge) }))
      : [];
  }

  private stringArrayValue(value: unknown) {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  private openingHoursValue(value: unknown) {
    return Array.isArray(value)
      ? value.map((item: Record<string, unknown>) => ({ day: this.stringCell(item?.day), hours: this.stringCell(item?.hours) }))
      : [];
  }

  private toRichTextDescription(value: string) {
    if (!value) return '';
    if (/<[a-z][\s\S]*>/i.test(value)) return value;
    return value
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private escapeHtml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private stripHtml(value?: string) {
    if (!value) return '';
    const document = new DOMParser().parseFromString(value.replace(/<\/p>\s*<p[^>]*>/gi, '\n'), 'text/html');
    return document.body.textContent?.trim() || '';
  }

  requestArchiveSelected() {
    if (!this.authService.canManageContent()) return;
    const selectedIds = new Set(this.selectedBusinessIds());
    const selected = this.businesses().filter((business) => selectedIds.has(business.id));

    if (selected.length === 0) {
      this.toastService.error('Select at least one business first.');
      return;
    }

    this.archiveMode.set(selected.every((business) => business.isArchived) ? 'unarchive' : 'archive');
    this.archiveTargetIds.set(selected.map((business) => business.id));
    this.showArchiveConfirmModal.set(true);
  }

  async confirmArchiveSelected() {
    const ids = this.archiveTargetIds();
    if (ids.length === 0) return;
    const isArchived = this.archiveMode() === 'archive';

    try {
      await Promise.all(ids.map((id) => this.firebaseService.update('businesses', id, { isArchived })));
      this.selectedBusinessIds.update((selected) => selected.filter((id) => !ids.includes(id)));
      const action = isArchived ? 'Archived' : 'Unarchived';
      this.toastService.success(`${action} ${ids.length} business${ids.length === 1 ? '' : 'es'}.`);
    } catch (e: any) {
      this.toastService.error(`Failed to ${isArchived ? 'archive' : 'unarchive'} businesses: ` + e.message);
    } finally {
      this.closeArchiveConfirmModal();
    }
  }

  closeArchiveConfirmModal() {
    this.showArchiveConfirmModal.set(false);
    this.archiveTargetIds.set([]);
  }

  toggleFeaturedFilter(checked: boolean) {
    this.updateBusinessFilters({
      isFeaturedFilter: checked,
      sortBy: checked ? 'featured-sort-id' : this.sortBy(),
      currentPage: 1
    });
  }

  toggleVerifiedFilter(checked: boolean) {
    this.updateBusinessFilters({
      isVerifiedFilter: checked,
      currentPage: 1
    });
  }

  togglePremiumFilter(checked: boolean) {
    this.updateBusinessFilters({
      isPremiumFilter: checked,
      currentPage: 1
    });
  }

  sortByColumn(column: 'title' | 'category' | 'phone' | 'rating' | 'state') {
    const direction = this.isSortedBy(column) && this.sortDirection() === 'asc' ? 'desc' : 'asc';
    this.updateBusinessFilters({
      sortBy: `${column}-${direction}` as BusinessSortOption,
      currentPage: 1
    });
  }

  isSortedBy(column: string): boolean {
    if (column === 'category') {
      return this.sortBy().startsWith('category-') && !this.sortBy().startsWith('category-order');
    }
    return this.sortBy().startsWith(`${column}-`);
  }

  sortDirection(): 'asc' | 'desc' {
    return this.sortBy().endsWith('-desc') ? 'desc' : 'asc';
  }

  sortAriaValue(column: string): 'ascending' | 'descending' | 'none' {
    if (!this.isSortedBy(column)) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
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
    if (!this.authService.canManageContent()) return;
    this.isReordering.update(v => !v);
    if (this.isReordering()) {
      const mode = this.reorderMode();
      this.updateBusinessFilters({
        sortBy: mode === 'featured' ? 'featured-sort-id' : mode === 'category' ? 'category-sort-id' : 'order'
      });
    }
    this.updateBusinessFilters({
      currentPage: 1,
      searchQuery: ''
    });
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
      const orderField = this.getActiveOrderField();
      if (this.getBusinessOrderValue(item, orderField) !== newOrder) {
        // Optimistic update
        this.setBusinessOrderValue(item, orderField, newOrder);
        
        // Push update
        updates.push(this.firebaseService.update('businesses', item.id, { [orderField]: newOrder }));
        
        // Update local full list ref
        const match = fullList.find(o => o.id === item.id);
        if (match) this.setBusinessOrderValue(match, orderField, newOrder);
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

  private getActiveOrderField(): 'categorySortId' | 'featuredSortId' | 'order' {
    if (this.reorderMode() === 'featured') return 'featuredSortId';
    if (this.reorderMode() === 'category') return 'categorySortId';
    return 'order';
  }

  private getBusinessOrderValue(business: Business, field: 'categorySortId' | 'featuredSortId' | 'order') {
    return business[field];
  }

  private setBusinessOrderValue(business: Business, field: 'categorySortId' | 'featuredSortId' | 'order', value: number) {
    business[field] = value;
  }

  async duplicate(item: Business) {
    if (!this.authService.canManageContent()) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = item;
    delete data.referralCode;
    const newItem = {
      ...data,
      title: `${data.title} (Copy)`,
      isPublished: false,
      rating: 0,
      reviews: 0,
      isVerified: false,
      isFeatured: false,
      isPremium: false,
      createdDate: new Date().toISOString(),
      referralCode: await this.referralCodeService.generateNextCode()
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
    if (!this.authService.isAdmin()) {
      this.closeConfirmModal();
      return;
    }
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
