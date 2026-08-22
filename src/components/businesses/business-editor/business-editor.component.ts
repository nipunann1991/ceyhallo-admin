
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { RichTextEditorComponent } from '../../ui/rich-text-editor.component';
import { ModalComponent } from '../../ui/modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../../ui/pagination-controls.component';
import { Business, BusinessLocation, MenuCatalogItem } from '../../../models/business.model';
import { BusinessContact, DeliveryInfo, OpeningHour } from '../../../models/common.model';
import { MediaItem } from '../../../models/media.model';
import { TaxonomyItem } from '../../../models/taxonomy.model';
import { optimizeImage } from '../../../utils/image-optimizer';
import * as XLSX from 'xlsx';
import { SlidingPanelComponent } from '../../ui/sliding-panel.component';
import { BusinessDetailComponent } from '../business-detail/business-detail.component';
import { ReferralCodeService } from '../../../services/referral-code.service';

interface GoogleReviewStats {
  rating: number;
  reviews: number;
  name?: string;
}

interface MediaFileReference {
  id: string;
  name: string;
  path: string;
}

@Component({
  selector: 'app-business-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent, ModalComponent, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, BusinessDetailComponent],
  templateUrl: './business-editor.component.html'
})
export class BusinessEditorComponent implements OnInit {
  form: FormGroup;
  isEditing = signal(false);
  isUploading = signal(false);
  isImportingMenu = signal(false);
  showMenuItemModal = signal(false);
  editingMenuItemIndex = signal<number | null>(null);
  menuItemForm: FormGroup;
  activeEditorTab = signal<'details' | 'locations' | 'gallery' | 'menu' | 'contact'>('details');
  currentId: string | null = null;
  
  locations = signal<any[]>([]);
  locationCityOptions = signal<Record<number, {code: string, name: string}[]>>({});
  expandedLocations = signal<Record<number, boolean>>({});
  categories = signal<TaxonomyItem[]>([]);
  categorySearch = signal('');
  showCategoryDropdown = signal(false);
  googleReviewStats = signal<Record<number, GoogleReviewStats | null>>({});
  googleReviewLoading = signal<Record<number, boolean>>({});
  googleReviewError = signal<Record<number, string>>({});
  googleMapEmbedUrl = signal<Record<number, SafeResourceUrl | null>>({});
  showMediaLibrary = signal(false);
  mediaLibraryTarget = signal<'gallery' | 'logo' | 'featured'>('gallery');
  mediaLibraryPath = signal('uploads');
  mediaLibraryFiles = signal<MediaItem[]>([]);
  mediaLibraryFileRefs = signal<MediaFileReference[]>([]);
  mediaLibraryFolders = signal<Array<{ name: string; path: string }>>([]);
  mediaLibraryCurrentPage = signal(1);
  selectedMediaPaths = signal<string[]>([]);
  mediaLibraryLoading = signal(false);
  mediaLibraryPageLoading = signal(false);
  mediaLibraryUploading = signal(false);
  mediaItemToDelete = signal<MediaItem | null>(null);
  showMediaDeleteConfirm = signal(false);
  previewBusiness = signal<Business | null>(null);
  readonly mediaLibraryPageSize = 36;
  private uploadedMediaPaths = new Set<string>();
  private mediaLibraryLoadedFileCache = new Map<string, MediaItem>();
  mediaLibraryImages = computed(() => this.mediaLibraryFiles().filter((file) => file.type.startsWith('image/')));
  mediaLibraryTotalItems = computed(() => this.mediaLibraryFileRefs().length);

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService,
    private referralCodeService: ReferralCodeService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      category: ['', Validators.required],
      type: [''],
      useCategoryAsType: [false],
      priceRange: [''],
      imageUrl: [''],
      logoUrl: [''], 
      menuUrl: [''], // Added catalog/menu URL
      menuItems: this.fb.array([]),
      isPublished: [true], 
      isPremium: [false],
      isVerified: [false],
      isFeatured: [false],
      isDeliveryAvailable: [false],
      isArchived: [false],
      alphabeticalSortKey: [''],
      categorySortId: [null],
      featuredSortId: [null],
      services: [''],
      galleryUrl: [''],
      gallery: this.fb.array([]),
      
      contactWebsite: [''],
      contactInstagram: [''],
      contactFacebook: [''],
      contactTiktok: [''],
      
      // Booking & Action
      actionType: ['none'],
      actionTarget: [''],

      deliveryInfo: this.fb.array([]),
      businessLocations: this.fb.array([])
    });

    this.menuItemForm = this.createMenuItemGroup();

    // Auto-unpublish when archived
    this.form.get('isArchived')?.valueChanges.subscribe(isArchived => {
      if (isArchived) {
        this.form.patchValue({ isPublished: false });
      }
    });
  }

  get deliveryInfoArray() { return this.form.get('deliveryInfo') as FormArray; }
  get businessLocationsArray() { return this.form.get('businessLocations') as FormArray; }
  get galleryArray() { return this.form.get('gallery') as FormArray; }
  get menuItemsArray() { return this.form.get('menuItems') as FormArray; }

  private createMenuItemGroup(item?: Partial<MenuCatalogItem>) {
    return this.fb.group({
      name: [item?.name || '', Validators.required],
      category: [item?.category || ''],
      description: [item?.description || ''],
      price: [item?.price || ''],
      imageUrl: [item?.imageUrl || '', Validators.pattern(/^https?:\/\/.+/i)]
    });
  }

  addMenuItem(item?: Partial<MenuCatalogItem>) {
    this.menuItemsArray.push(this.createMenuItemGroup(item));
  }

  removeMenuItem(index: number) {
    this.menuItemsArray.removeAt(index);
  }

  menuItemGroups() {
    const groups = new Map<string, Array<{ index: number; item: MenuCatalogItem }>>();
    (this.menuItemsArray.getRawValue() as MenuCatalogItem[]).forEach((item, index) => {
      const category = String(item.category || '').trim() || 'Other';
      const entries = groups.get(category) || [];
      entries.push({ index, item });
      groups.set(category, entries);
    });
    return Array.from(groups, ([category, items]) => ({ category, items }));
  }

  openAddMenuItem() {
    this.editingMenuItemIndex.set(null);
    this.menuItemForm.reset({ name: '', category: '', description: '', price: '', imageUrl: '' });
    this.showMenuItemModal.set(true);
  }

  openEditMenuItem(index: number) {
    const item = this.menuItemsArray.at(index)?.getRawValue();
    if (!item) return;
    this.editingMenuItemIndex.set(index);
    this.menuItemForm.reset(item);
    this.showMenuItemModal.set(true);
  }

  closeMenuItemModal() {
    this.showMenuItemModal.set(false);
    this.editingMenuItemIndex.set(null);
  }

  saveMenuItem() {
    if (this.menuItemForm.invalid) {
      this.menuItemForm.markAllAsTouched();
      return;
    }
    const item = this.menuItemForm.getRawValue();
    const index = this.editingMenuItemIndex();
    if (index === null) this.addMenuItem(item);
    else this.menuItemsArray.at(index).patchValue(item);
    this.closeMenuItemModal();
  }

  deleteEditingMenuItem() {
    const index = this.editingMenuItemIndex();
    if (index !== null) this.removeMenuItem(index);
    this.closeMenuItemModal();
  }

  async importMenuFromExcel(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImportingMenu.set(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('The workbook does not contain a worksheet.');

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
        defval: '',
        raw: true
      });
      if (rows.length === 0) throw new Error('The worksheet does not contain any menu items.');

      let importedCount = 0;
      let skippedCount = 0;
      rows.slice(0, 1000).forEach((row) => {
        const normalized = Object.entries(row).reduce<Record<string, unknown>>((result, [key, value]) => {
          result[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = value;
          return result;
        }, {});
        const name = this.firstMenuImportValue(normalized, ['item', 'itemname', 'name', 'product', 'productname']);
        if (!name) {
          skippedCount += 1;
          return;
        }

        const rawPrice = this.firstMenuImportValue(normalized, ['priceaed', 'price', 'amount', 'cost']);
        const hasAedHeader = Object.keys(normalized).includes('priceaed');
        const price = rawPrice && hasAedHeader && !/^aed\b/i.test(rawPrice) ? `AED ${rawPrice}` : rawPrice;
        this.addMenuItem({
          name,
          category: this.firstMenuImportValue(normalized, ['category', 'section', 'group']),
          description: this.firstMenuImportValue(normalized, ['description', 'details', 'notes']),
          price,
          imageUrl: this.firstMenuImportValue(normalized, ['imageurl', 'image', 'photo', 'photourl'])
        });
        importedCount += 1;
      });

      if (importedCount === 0) {
        throw new Error('No rows with an Item or Name column were found.');
      }
      const skippedMessage = skippedCount ? ` ${skippedCount} blank row${skippedCount === 1 ? ' was' : 's were'} skipped.` : '';
      this.toastService.success(`${importedCount} menu item${importedCount === 1 ? '' : 's'} imported.${skippedMessage}`);
    } catch (error: any) {
      this.toastService.error('Menu import failed: ' + (error?.message || 'Unable to read the Excel file.'));
    } finally {
      input.value = '';
      this.isImportingMenu.set(false);
    }
  }

  private firstMenuImportValue(row: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  }

  filteredCategories() {
    const search = this.categorySearch().toLowerCase();
    return this.categories().filter(c => c.name.toLowerCase().includes(search));
  }

  selectCategory(name: string) {
    this.form.patchValue({ category: name });
    this.categorySearch.set(name);
    this.showCategoryDropdown.set(false);
    this.syncTypeWithCategory();
    console.log(name);
  }

  onCategoryInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.categorySearch.set(val);
    this.showCategoryDropdown.set(true);
    // If the value matches exactly one category, we could auto-select, but better to let user click
    this.form.patchValue({ category: val }); // Keep form in sync if they just type
    this.syncTypeWithCategory();
  }

  syncTypeWithCategory() {
    if (this.form.get('useCategoryAsType')?.value) {
      this.form.patchValue({ type: this.form.get('category')?.value });
    }
  }

  addDeliveryInfoRow(location: string = '', charge: string = '') {
    this.deliveryInfoArray.push(this.fb.group({
      location: [location, Validators.required],
      charge: [charge, Validators.required]
    }));
  }

  removeDeliveryInfoRow(index: number) {
    this.deliveryInfoArray.removeAt(index);
  }

  private createBusinessLocationGroup(data?: Partial<BusinessLocation>) {
    return this.fb.group({
      isPrimary: [!!data?.isPrimary],
      countryCode: [data?.countryCode || 'AE', Validators.required],
      cityCode: [data?.cityCode || 'DXB', Validators.required],
      location: [data?.location || '', Validators.required],
      mapQuery: [data?.mapQuery || ''],
      useBusinessNameForMap: [data?.useBusinessNameForMap !== false],
      googlePlaceId: [data?.googlePlaceId || ''],
      rating: [Number(data?.rating ?? 4.8), [Validators.required, Validators.min(0), Validators.max(5)]],
      reviews: [Number(data?.reviews ?? 0), [Validators.required, Validators.min(0)]],
      phones: this.fb.array((data?.phones || []).map(phone => this.fb.control(phone))),
      openingHours: this.fb.array((data?.openingHours || []).map((item: OpeningHour) => this.fb.group({
        day: [item.day || '', Validators.required],
        hours: [item.hours || '', Validators.required]
      })))
    });
  }

  addBusinessLocation(data?: Partial<BusinessLocation>) {
    const index = this.businessLocationsArray.length;
    const shouldBePrimary = data?.isPrimary ?? index === 0;
    this.businessLocationsArray.push(this.createBusinessLocationGroup({ ...data, isPrimary: shouldBePrimary }));
    this.updateCitiesForLocation(index, data?.countryCode || 'AE', false);
    this.expandedLocations.set(
      Array.from({ length: this.businessLocationsArray.length }).reduce<Record<number, boolean>>((acc, _, itemIndex) => {
        acc[itemIndex] = itemIndex === index;
        return acc;
      }, {})
    );
    const cityOptions = this.getLocationCities(index);
    if (cityOptions.length > 0 && !data?.cityCode) {
      this.businessLocationsArray.at(index).patchValue({ cityCode: cityOptions[0].code });
    }
    if (shouldBePrimary) {
      this.setPrimaryLocation(index);
    }
  }

  removeBusinessLocation(index: number) {
    if (this.businessLocationsArray.length <= 1) {
      return;
    }

    const wasPrimary = !!this.getLocationGroup(index)?.get('isPrimary')?.value;
    this.businessLocationsArray.removeAt(index);
    this.reindexLocationState();
    if (wasPrimary && this.businessLocationsArray.length > 0) {
      this.setPrimaryLocation(0);
    }
  }

  getLocationPhonesArray(index: number) {
    return this.getLocationGroup(index).get('phones') as FormArray;
  }

  addLocationPhone(index: number, value: string = '') {
    this.getLocationPhonesArray(index).push(this.fb.control(value));
  }

  removeLocationPhone(locationIndex: number, phoneIndex: number) {
    this.getLocationPhonesArray(locationIndex).removeAt(phoneIndex);
  }

  getLocationOpeningHoursArray(index: number) {
    return this.getLocationGroup(index).get('openingHours') as FormArray;
  }

  addLocationOpeningHourRow(index: number, day: string = '', hours: string = '') {
    this.getLocationOpeningHoursArray(index).push(this.fb.group({
      day: [day, Validators.required],
      hours: [hours, Validators.required]
    }));
  }

  removeLocationOpeningHourRow(locationIndex: number, hourIndex: number) {
    this.getLocationOpeningHoursArray(locationIndex).removeAt(hourIndex);
  }

  ngOnInit() {
    this.loadTaxonomies();
    this.loadCountries();
    this.initializeEditorMode();
  }

  private loadTaxonomies() {
    this.firebaseService.listenToPath<TaxonomyItem>('taxonomy_business', (data) => {
      this.categories.set(data.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }

  private loadCountries() {
    this.firebaseService.listenToPath<any>('countries', (data) => {
      this.locations.set(this.mapCountriesToLocations(data));
      this.rebuildAllLocationCityOptions();
    });
  }

  private mapCountriesToLocations(data: any[]) {
    return data.map(country => {
      let citiesArray: { code: string; name: string }[] = [];
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
  }

  private initializeEditorMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.currentId = id;
      this.loadData(id);
      window.scrollTo(0, 0);
      return;
    }

    this.addBusinessLocation({
      isPrimary: true,
      phones: [''],
      openingHours: [
        { day: 'Mon - Fri', hours: '9:00 AM - 6:00 PM' },
        { day: 'Sat - Sun', hours: 'Closed' }
      ]
    });
  }

  async loadData(id: string) {
    try {
      const doc = await this.firebaseService.getDocument('businesses', id);
      if (doc) {
        const formData = {
           title: doc.title,
           description: doc.description,
           category: doc.category,
           type: doc.type || '',
           useCategoryAsType: doc.type === doc.category && !!doc.category,
           priceRange: doc.priceRange || '',
           imageUrl: doc.imageUrl,
           logoUrl: doc.logoUrl || '',
           menuUrl: doc.menuUrl || '', // Load catalog URL
           isPublished: doc.isPublished !== false,
           isPremium: doc.isPremium,
           isVerified: doc.isVerified,
           isFeatured: doc.isFeatured,
           isDeliveryAvailable: doc.isDeliveryAvailable || false,
           isArchived: doc.isArchived || false,
           alphabeticalSortKey: doc.alphabeticalSortKey || this.buildAlphabeticalSortKey(doc.title),
           categorySortId: doc.categorySortId ?? doc.order ?? null,
           featuredSortId: doc.featuredSortId ?? null,
           services: doc.services ? doc.services.join(', ') : '',
           contactWebsite: doc.contact?.website || '',
           contactInstagram: doc.contact?.instagram || '',
           contactFacebook: doc.contact?.facebook || '',
           contactTiktok: doc.contact?.tiktok || '',
           actionType: doc.actionType || 'none',
           actionTarget: doc.actionTarget || ''
        };
        this.form.patchValue(formData);
        this.categorySearch.set(doc.category || '');

        this.galleryArray.clear();
        this.normalizeGalleryUrls(doc.gallery).forEach((url) => {
          if (url) this.galleryArray.push(this.fb.control(url));
        });

        this.menuItemsArray.clear();
        if (Array.isArray(doc.menuItems)) {
          doc.menuItems.forEach((item: MenuCatalogItem) => this.addMenuItem(item));
        }

        this.businessLocationsArray.clear();
        const savedLocations = Array.isArray(doc.locations) && doc.locations.length > 0
          ? doc.locations
          : [{
              location: doc.location || '',
              mapQuery: doc.location || '',
              useBusinessNameForMap: true,
              isPrimary: true,
              googlePlaceId: doc.googlePlaceId || '',
              rating: Number(doc.rating ?? 4.8),
              reviews: Number(doc.reviews ?? 0),
              countryCode: doc.countryCode || 'AE',
              cityCode: doc.cityCode || 'DXB',
              phones: doc.contact?.phones || ((doc.contact as any)?.phone ? [(doc.contact as any).phone] : ['']),
              openingHours: Array.isArray(doc.openingHours) ? doc.openingHours : [
                { day: 'Mon - Fri', hours: '9:00 AM - 6:00 PM' }
              ]
            }];

        savedLocations.forEach((location: any) => this.addBusinessLocation(location));
        this.rebuildAllLocationCityOptions();
        savedLocations.forEach((location: any, index: number) => {
          this.setMapPreviewFromQuery(index);
          if (location?.googlePlaceId) {
            this.fetchGoogleReviewStats(index, location.googlePlaceId, false);
          }
        });

        this.deliveryInfoArray.clear();
        if (doc.deliveryInfo && Array.isArray(doc.deliveryInfo)) {
           doc.deliveryInfo.forEach((di: any) => this.addDeliveryInfoRow(di.location, di.charge));
        }
      }
    } catch (e) {
      this.toastService.error('Failed to load business data');
      this.returnToBusinesses();
    }
  }

  onLocationCountryChange(index: number) {
    const code = this.getLocationGroup(index)?.get('countryCode')?.value || 'AE';
    this.updateCitiesForLocation(index, code, true);
  }

  updateCitiesForLocation(index: number, countryCode: string, patchFirstCity = false) {
    const country = this.locations().find(c => c.code === countryCode);
    const cities = country ? country.cities : [];
    this.locationCityOptions.update(current => ({ ...current, [index]: cities }));

    if (patchFirstCity) {
      this.getLocationGroup(index)?.patchValue({ cityCode: cities[0]?.code || '' });
    }
  }

  getLocationCities(index: number) {
    return this.locationCityOptions()[index] || [];
  }

  getLocationGroup(index: number) {
    return this.businessLocationsArray.at(index) as FormGroup;
  }

  locationStats(index: number) {
    return this.googleReviewStats()[index] || null;
  }

  locationLoading(index: number) {
    return !!this.googleReviewLoading()[index];
  }

  locationError(index: number) {
    return this.googleReviewError()[index] || '';
  }

  locationMap(index: number) {
    return this.googleMapEmbedUrl()[index] || null;
  }

  onUseBusinessNameForMapChange(index: number) {
    const locationGroup = this.getLocationGroup(index);
    if (!locationGroup?.get('useBusinessNameForMap')?.value) {
      return;
    }

    locationGroup.patchValue({
      mapQuery: String(this.form.get('title')?.value || '').trim()
    });
  }

  private buildLocationMapQuery(index: number) {
    const locationGroup = this.getLocationGroup(index);
    const businessName = String(this.form.get('title')?.value || '').trim();
    const displayedAddress = String(locationGroup?.get('location')?.value || '').trim();
    const manualQuery = String(locationGroup?.get('mapQuery')?.value || '').trim();
    const useBusinessName = locationGroup?.get('useBusinessNameForMap')?.value !== false;
    const cityCode = String(locationGroup?.get('cityCode')?.value || '').trim();
    const countryCode = String(locationGroup?.get('countryCode')?.value || '').trim();
    const cityName = this.getLocationCities(index).find(city => city.code === cityCode)?.name || cityCode;
    const countryName = this.locations().find(country => country.code === countryCode)?.name || countryCode;
    const primaryQuery = manualQuery || displayedAddress;
    const includeBusinessName = useBusinessName && businessName && primaryQuery.toLowerCase() !== businessName.toLowerCase();

    return [includeBusinessName ? businessName : '', primaryQuery, cityName, countryName]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  private setMapPreviewFromQuery(index: number) {
    const query = this.buildLocationMapQuery(index);
    if (!query) {
      this.googleMapEmbedUrl.update(current => ({ ...current, [index]: null }));
      return '';
    }

    const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    this.googleMapEmbedUrl.update(current => ({
      ...current,
      [index]: this.sanitizer.bypassSecurityTrustResourceUrl(mapSrc)
    }));
    return query;
  }

  isPrimaryLocation(index: number) {
    return !!this.getLocationGroup(index)?.get('isPrimary')?.value;
  }

  setPrimaryLocation(index: number) {
    for (let itemIndex = 0; itemIndex < this.businessLocationsArray.length; itemIndex += 1) {
      this.getLocationGroup(itemIndex)?.patchValue({ isPrimary: itemIndex === index }, { emitEvent: false });
    }
  }

  private rebuildAllLocationCityOptions() {
    for (let index = 0; index < this.businessLocationsArray.length; index += 1) {
      const countryCode = this.getLocationGroup(index)?.get('countryCode')?.value || 'AE';
      this.updateCitiesForLocation(index, countryCode, false);
    }
  }

  private reindexLocationState() {
    const currentStats = this.googleReviewStats();
    const currentLoading = this.googleReviewLoading();
    const currentError = this.googleReviewError();
    const currentMaps = this.googleMapEmbedUrl();

    const nextStats: Record<number, GoogleReviewStats | null> = {};
    const nextLoading: Record<number, boolean> = {};
    const nextError: Record<number, string> = {};
    const nextMaps: Record<number, SafeResourceUrl | null> = {};
    const nextCities: Record<number, {code: string, name: string}[]> = {};

    for (let index = 0; index < this.businessLocationsArray.length; index += 1) {
      nextStats[index] = currentStats[index] || null;
      nextLoading[index] = currentLoading[index] || false;
      nextError[index] = currentError[index] || '';
      nextMaps[index] = currentMaps[index] || null;
      nextCities[index] = this.getLocationCities(index);
    }

    this.googleReviewStats.set(nextStats);
    this.googleReviewLoading.set(nextLoading);
    this.googleReviewError.set(nextError);
    this.googleMapEmbedUrl.set(nextMaps);
    this.locationCityOptions.set(nextCities);
    const nextExpanded = Array.from({ length: this.businessLocationsArray.length }).reduce<Record<number, boolean>>((acc, _, index) => {
      acc[index] = this.isPrimaryLocation(index) ? true : !!this.expandedLocations()[index];
      return acc;
    }, {});
    this.expandedLocations.set(nextExpanded);
  }

  isLocationExpanded(index: number) {
    return this.expandedLocations()[index] !== false;
  }

  toggleLocationExpanded(index: number) {
    this.expandedLocations.update(current => ({
      ...current,
      [index]: !(current[index] !== false)
    }));
  }

  addGalleryUrl() {
    const url = String(this.form.get('galleryUrl')?.value || '').trim();
    if (!url) return;
    this.galleryArray.push(this.fb.control(url));
    this.form.patchValue({ galleryUrl: '' });
  }

  removeGalleryImage(index: number) {
    this.galleryArray.removeAt(index);
  }

  async openMediaLibrary(target: 'gallery' | 'logo' | 'featured' = 'gallery') {
    this.mediaLibraryTarget.set(target);
    this.showMediaLibrary.set(true);
    this.selectedMediaPaths.set([]);
    this.uploadedMediaPaths.clear();
    await this.loadMediaLibrary('uploads');
  }

  async loadMediaLibrary(path = this.mediaLibraryPath()) {
    this.mediaLibraryLoading.set(true);
    try {
      const result = await this.firebaseService.listFileReferences(path);
      this.mediaLibraryPath.set(path);
      this.mediaLibraryFileRefs.set(result.fileRefs);
      this.mediaLibraryFolders.set(result.folders);
      this.mediaLibraryCurrentPage.set(1);
      this.selectedMediaPaths.set(result.fileRefs
        .filter((file) => this.uploadedMediaPaths.has(file.path))
        .map((file) => file.path));
      await this.loadMediaLibraryPage(1);
    } catch (error) {
      this.toastService.error('Failed to load the media library.');
    } finally {
      this.mediaLibraryLoading.set(false);
    }
  }

  async loadMediaLibraryPage(page: number) {
    this.mediaLibraryCurrentPage.set(page);
    this.mediaLibraryFiles.set([]);
    this.mediaLibraryPageLoading.set(true);
    try {
      const start = (page - 1) * this.mediaLibraryPageSize;
      const refs = this.mediaLibraryFileRefs().slice(start, start + this.mediaLibraryPageSize);
      const pathsToLoad = refs
        .map((file) => file.path)
        .filter((path) => !this.mediaLibraryLoadedFileCache.has(path));

      if (pathsToLoad.length > 0) {
        const files = await this.firebaseService.getFilesByPaths(pathsToLoad);
        files.forEach((file) => this.mediaLibraryLoadedFileCache.set(file.path, file));
      }

      this.mediaLibraryFiles.set(refs
        .map((file) => this.mediaLibraryLoadedFileCache.get(file.path))
        .filter((file): file is MediaItem => Boolean(file)));
    } catch (error) {
      this.toastService.error('Failed to load media page.');
    } finally {
      this.mediaLibraryPageLoading.set(false);
    }
  }

  navigateMediaLibraryUp() {
    const parts = this.mediaLibraryPath().split('/').filter(Boolean);
    if (parts.length <= 1) return;
    parts.pop();
    this.loadMediaLibrary(parts.join('/'));
  }

  toggleMediaSelection(path: string) {
    if (this.mediaLibraryTarget() !== 'gallery') {
      this.selectedMediaPaths.update((current) => current[0] === path ? [] : [path]);
      return;
    }

    this.selectedMediaPaths.update((current) => current.includes(path)
      ? current.filter((item) => item !== path)
      : [...current, path]);
  }

  isMediaSelected(path: string) {
    return this.selectedMediaPaths().includes(path);
  }

  addSelectedMediaToGallery() {
    const selectedPaths = new Set(this.selectedMediaPaths());
    const selectedFiles = Array.from(selectedPaths)
      .map((path) => this.mediaLibraryLoadedFileCache.get(path))
      .filter((file): file is MediaItem => Boolean(file));
    const target = this.mediaLibraryTarget();

    if (target === 'logo' || target === 'featured') {
      const selectedFile = selectedFiles[0];
      if (!selectedFile) return;
      this.form.patchValue(target === 'logo' ? { logoUrl: selectedFile.url } : { imageUrl: selectedFile.url });
      this.showMediaLibrary.set(false);
      return;
    }

    const existingUrls = new Set(this.galleryArray.getRawValue().map((url: unknown) => String(url)));
    const selectedUrls = selectedFiles
      .map((file) => file.url)
      .filter((url) => !existingUrls.has(url));

    selectedUrls.forEach((url) => this.galleryArray.push(this.fb.control(url)));
    this.showMediaLibrary.set(false);
    this.toastService.success(`${selectedUrls.length} image${selectedUrls.length === 1 ? '' : 's'} added to the gallery.`);
  }

  requestDeleteMediaFromLibrary(file: MediaItem) {
    this.mediaItemToDelete.set(file);
    this.showMediaDeleteConfirm.set(true);
  }

  closeMediaDeleteConfirm() {
    this.showMediaDeleteConfirm.set(false);
    this.mediaItemToDelete.set(null);
  }

  async confirmDeleteMediaFromLibrary() {
    const file = this.mediaItemToDelete();
    if (!file) return;

    try {
      await this.firebaseService.deleteFile(file.path);
      this.mediaLibraryFileRefs.update((files) => files.filter((item) => item.path !== file.path));
      this.mediaLibraryFiles.update((files) => files.filter((item) => item.path !== file.path));
      this.selectedMediaPaths.update((paths) => paths.filter((path) => path !== file.path));
      this.mediaLibraryLoadedFileCache.delete(file.path);
      for (let index = this.galleryArray.length - 1; index >= 0; index -= 1) {
        if (this.galleryArray.at(index).value === file.url) this.galleryArray.removeAt(index);
      }
      this.toastService.success('Image deleted from the media library.');
    } catch (error: any) {
      this.toastService.error('Image deletion failed: ' + error.message);
    } finally {
      this.closeMediaDeleteConfirm();
    }
  }

  async uploadMediaLibraryImages(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const targetPath = this.mediaLibraryPath() || 'uploads';
    this.mediaLibraryUploading.set(true);
    try {
      const uploadedPaths: string[] = [];
      for (const rawFile of files) {
        const file = await optimizeImage(rawFile);
        const path = `${targetPath}/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
        await this.firebaseService.uploadFile(path, file);
        uploadedPaths.push(path);
        this.uploadedMediaPaths.add(path);
      }
      this.mediaLibraryLoadedFileCache.clear();
      await this.loadMediaLibrary(targetPath);
      if (this.mediaLibraryTarget() !== 'gallery') {
        const newestUploaded = uploadedPaths.at(-1);
        this.selectedMediaPaths.set(newestUploaded ? [newestUploaded] : []);
      }
      this.toastService.success(`${uploadedPaths.length} image${uploadedPaths.length === 1 ? '' : 's'} uploaded.`);
    } catch (error) {
      this.toastService.error('Media upload failed.');
    } finally {
      input.value = '';
      this.mediaLibraryUploading.set(false);
    }
  }

  private normalizeGalleryUrls(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((url) => String(url).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((url) => String(url).trim()).filter(Boolean) : [];
      } catch {
        return value.trim() ? [value.trim()] : [];
      }
    }

    return [];
  }

  async onGalleryImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    this.isUploading.set(true);
    try {
      for (const rawFile of files) {
        const file = await optimizeImage(rawFile);
        const path = `businesses/gallery/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
        const url = await this.firebaseService.uploadFile(path, file);
        this.galleryArray.push(this.fb.control(url));
      }
      this.toastService.success(`${files.length} gallery image${files.length === 1 ? '' : 's'} uploaded.`);
    } catch (e) {
      this.toastService.error('Gallery upload failed');
    } finally {
      input.value = '';
      this.isUploading.set(false);
    }
  }

  async onMenuFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.toastService.error('Please upload the catalog in PDF format.');
      input.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      this.toastService.error('The PDF must be 15 MB or smaller.');
      input.value = '';
      return;
    }
    this.isUploading.set(true);
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
         fileToUpload = await optimizeImage(file);
      }
      const path = `businesses/catalogs/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, fileToUpload);
      this.form.patchValue({ menuUrl: url });
      this.toastService.success('Catalog uploaded');
    } catch (e) {
      this.toastService.error('Catalog upload failed');
    } finally {
      input.value = '';
      this.isUploading.set(false);
    }
  }

  async fetchGoogleReviewStats(index: number, placeId?: string, showToast = true) {
    const googlePlaceId = String(placeId ?? this.getLocationGroup(index)?.get('googlePlaceId')?.value ?? '').trim();
    if (!googlePlaceId) {
      this.googleReviewError.update(current => ({ ...current, [index]: 'Add a Google Place ID to fetch live reviews.' }));
      this.googleReviewStats.update(current => ({ ...current, [index]: null }));
      return;
    }

    this.googleReviewLoading.update(current => ({ ...current, [index]: true }));
    this.googleReviewError.update(current => ({ ...current, [index]: '' }));
    try {
      const result = await this.firebaseService.callFunction('fetchGooglePlaceDetails', { placeId: googlePlaceId });
      if (result?.success === false) {
        throw new Error(result?.message || 'Failed to fetch Google review stats.');
      }
      const rating = Number(result?.rating ?? 0);
      const reviews = Number(result?.reviews ?? 0);

      this.googleReviewStats.update(current => ({
        ...current,
        [index]: {
          rating,
          reviews,
          name: result?.name
        }
      }));

      const lat = Number(result?.lat);
      const lng = Number(result?.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const embedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
        this.googleMapEmbedUrl.update(current => ({
          ...current,
          [index]: this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl)
        }));
      } else {
        this.googleMapEmbedUrl.update(current => ({ ...current, [index]: null }));
      }

      this.getLocationGroup(index)?.patchValue({
        googlePlaceId,
        rating,
        reviews
      });
      if (showToast) {
        this.toastService.success('Google review stats loaded.');
      }
    } catch (e: any) {
      this.googleReviewStats.update(current => ({ ...current, [index]: null }));
      this.googleReviewError.update(current => ({ ...current, [index]: e?.message || 'Failed to fetch Google review stats.' }));
      if (showToast) {
        this.toastService.error(this.locationError(index));
      }
    } finally {
      this.googleReviewLoading.update(current => ({ ...current, [index]: false }));
    }
  }

  async resolveGooglePlaceFromAddress(index: number, address?: string, showToast = true) {
    const trimmedAddress = String(address ?? '').trim();
    if (!trimmedAddress) {
      return null;
    }

    this.googleReviewLoading.update(current => ({ ...current, [index]: true }));
    this.googleReviewError.update(current => ({ ...current, [index]: '' }));
    try {
      const result = await this.firebaseService.callFunction('resolveGooglePlaceFromAddress', {
        address: trimmedAddress,
        countryCode: this.getLocationGroup(index)?.get('countryCode')?.value || 'AE'
      });

      if (result?.success === false) {
        throw new Error(result?.message || 'Failed to resolve address.');
      }

      const placeId = String(result?.placeId || '').trim();
      if (!placeId) {
        throw new Error('No Google Place ID was returned for this address.');
      }

      this.getLocationGroup(index)?.patchValue({ googlePlaceId: placeId }, { emitEvent: false });
      await this.fetchGoogleReviewStats(index, placeId, false);
      return result;
    } catch (e: any) {
      this.googleReviewError.update(current => ({
        ...current,
        [index]: e?.message || 'Failed to resolve Google Place ID from the address.'
      }));
      this.googleReviewStats.update(current => ({ ...current, [index]: null }));
      if (showToast) {
        this.toastService.error(this.locationError(index));
      }
      return null;
    } finally {
      this.googleReviewLoading.update(current => ({ ...current, [index]: false }));
    }
  }

  async fetchMapAndReviews(index: number) {
    const query = this.setMapPreviewFromQuery(index);
    if (!query) {
      this.toastService.error('Please add the business name and displayed address first.');
      return;
    }

    await this.resolveGooglePlaceFromAddress(index, query, true);
  }

  async save(openPreview = false) {
    if (!this.authService.canManageContent()) {
      this.toastService.error('Unauthorized');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Please fill in all required fields');
      return;
    }

    const raw = this.form.getRawValue();
    const alphabeticalSortKey = String(raw.alphabeticalSortKey || '').trim() || this.buildAlphabeticalSortKey(raw.title);
    if (!Array.isArray(raw.businessLocations) || raw.businessLocations.length === 0) {
      this.toastService.error('Please add at least one business location.');
      return;
    }

    const normalizedLocations: BusinessLocation[] = raw.businessLocations
      .map((item: any) => ({
        isPrimary: !!item.isPrimary,
        location: String(item.location || '').trim(),
        mapQuery: String(item.mapQuery || '').trim(),
        useBusinessNameForMap: item.useBusinessNameForMap !== false,
        googlePlaceId: String(item.googlePlaceId || '').trim(),
        rating: Number(item.rating ?? 0),
        reviews: Number(item.reviews ?? 0),
        countryCode: String(item.countryCode || 'AE').trim(),
        cityCode: String(item.cityCode || '').trim(),
        phones: Array.isArray(item.phones) ? item.phones.map((phone: string) => String(phone || '').trim()).filter(Boolean) : [],
        openingHours: Array.isArray(item.openingHours)
          ? item.openingHours
              .map((hour: any) => ({
                day: String(hour?.day || '').trim(),
                hours: String(hour?.hours || '').trim()
              }))
              .filter((hour: OpeningHour) => hour.day || hour.hours)
          : []
      }))
      .filter((item: BusinessLocation) => item.location);

    if (normalizedLocations.length === 0) {
      this.toastService.error('Please add at least one valid business location.');
      return;
    }

    for (let index = 0; index < normalizedLocations.length; index += 1) {
      const item = normalizedLocations[index];
      if (!item.googlePlaceId) {
        await this.fetchMapAndReviews(index);
        const refreshed = this.getLocationGroup(index)?.getRawValue();
        normalizedLocations[index] = {
          ...item,
          googlePlaceId: String(refreshed?.googlePlaceId || '').trim(),
          rating: Number(refreshed?.rating ?? item.rating),
          reviews: Number(refreshed?.reviews ?? item.reviews)
        };
      }
    }

    const primaryIndex = Math.max(0, normalizedLocations.findIndex((item: BusinessLocation) => item.isPrimary));
    normalizedLocations.forEach((item: BusinessLocation, index: number) => {
      item.isPrimary = index === primaryIndex;
    });
    const primaryLocation = normalizedLocations[primaryIndex];

    const contact: BusinessContact = {
      phones: primaryLocation.phones || [],
      website: raw.contactWebsite,
      instagram: raw.contactInstagram,
      facebook: raw.contactFacebook,
      tiktok: raw.contactTiktok
    };

    const dataToSave = {
      title: raw.title,
      description: raw.description,
      category: raw.category,
      type: raw.type,
      priceRange: raw.priceRange,
      location: primaryLocation.location,
      locations: normalizedLocations,
      imageUrl: raw.imageUrl,
      logoUrl: raw.logoUrl,
      menuUrl: raw.menuUrl, // Save catalog URL
      menuItems: (raw.menuItems || []).map((item: MenuCatalogItem) => ({
        name: String(item.name || '').trim(),
        category: String(item.category || '').trim(),
        description: String(item.description || '').trim(),
        price: String(item.price || '').trim(),
        imageUrl: String(item.imageUrl || '').trim()
      })).filter((item: MenuCatalogItem) => item.name),
      googlePlaceId: primaryLocation.googlePlaceId,
      rating: primaryLocation.rating,
      reviews: primaryLocation.reviews,
      countryCode: primaryLocation.countryCode,
      cityCode: primaryLocation.cityCode,
      isPublished: raw.isPublished,
      isPremium: raw.isPremium,
      isVerified: raw.isVerified,
      isFeatured: raw.isFeatured,
      isDeliveryAvailable: raw.isDeliveryAvailable,
      isArchived: raw.isArchived,
      alphabeticalSortKey,
      categorySortId: this.optionalNumberValue(raw.categorySortId),
      featuredSortId: this.optionalNumberValue(raw.featuredSortId),
      services: raw.services ? raw.services.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      gallery: (raw.gallery || []).map((url: unknown) => String(url).trim()).filter(Boolean),
      contact,
      openingHours: primaryLocation.openingHours || [],
      deliveryInfo: raw.deliveryInfo as DeliveryInfo[],
      actionType: raw.actionType,
      actionTarget: raw.actionTarget
    };

    if (!this.isEditing()) {
       (dataToSave as any).createdDate = new Date().toISOString();
       (dataToSave as any).publishedDate = new Date().toISOString();
       try {
         (dataToSave as any).referralCode = await this.referralCodeService.generateNextCode();
       } catch (error) {
         console.error('Referral code generation failed:', error);
         this.toastService.error('Could not generate a referral code. Please try saving again.');
         return;
       }
    }

    try {
      let savedBusiness: Business;
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('businesses', this.currentId, dataToSave);
        savedBusiness = { id: this.currentId, ...dataToSave } as Business;
        this.toastService.success('Business updated');
      } else {
        savedBusiness = await this.firebaseService.create('businesses', dataToSave) as Business;
        this.toastService.success('Business created');
      }
      if (openPreview) {
        this.previewBusiness.set(savedBusiness);
      } else {
        this.returnToBusinesses();
      }
    } catch (e: any) {
      this.toastService.error('Save failed: ' + e.message);
    }
  }

  businessReturnQueryParams() {
    return {
      categoryId: this.route.snapshot.queryParamMap.get('categoryId'),
      page: this.route.snapshot.queryParamMap.get('page')
    };
  }

  private returnToBusinesses() {
    this.router.navigate(['/businesses'], { queryParams: this.businessReturnQueryParams() });
  }

  closePreview() {
    this.previewBusiness.set(null);
  }

  private buildAlphabeticalSortKey(value: unknown) {
    return String(value || '').trim().toLocaleLowerCase();
  }

  private optionalNumberValue(value: unknown) {
    const parsed = Number(value);
    return value === null || value === undefined || String(value).trim() === '' || !Number.isFinite(parsed)
      ? null
      : parsed;
  }
}
