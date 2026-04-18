
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { RichTextEditorComponent } from '../ui/rich-text-editor.component';
import { TaxonomyItem } from '../../models/taxonomy.model';
import { optimizeImage } from '../../utils/image-optimizer';

interface GoogleReviewStats {
  rating: number;
  reviews: number;
  name?: string;
}

interface BusinessLocationValue {
  isPrimary?: boolean;
  location: string;
  googlePlaceId?: string;
  rating: number;
  reviews: number;
  countryCode: string;
  cityCode: string;
  phones?: string[];
  openingHours?: { day: string; hours: string }[];
}

@Component({
  selector: 'app-business-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './business-editor.component.html'
})
export class BusinessEditorComponent implements OnInit {
  form: FormGroup;
  isEditing = signal(false);
  isUploading = signal(false);
  activeEditorTab = signal<'details' | 'locations' | 'contact'>('details');
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

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService,
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
      isPublished: [true], 
      isPremium: [false],
      isVerified: [false],
      isFeatured: [false],
      isDeliveryAvailable: [false],
      isArchived: [false],
      services: [''],
      
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

    // Auto-unpublish when archived
    this.form.get('isArchived')?.valueChanges.subscribe(isArchived => {
      if (isArchived) {
        this.form.patchValue({ isPublished: false });
      }
    });
  }

  get deliveryInfoArray() { return this.form.get('deliveryInfo') as FormArray; }
  get businessLocationsArray() { return this.form.get('businessLocations') as FormArray; }

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

  private createBusinessLocationGroup(data?: Partial<BusinessLocationValue>) {
    return this.fb.group({
      isPrimary: [!!data?.isPrimary],
      countryCode: [data?.countryCode || 'AE', Validators.required],
      cityCode: [data?.cityCode || 'DXB', Validators.required],
      location: [data?.location || '', Validators.required],
      googlePlaceId: [data?.googlePlaceId || ''],
      rating: [Number(data?.rating ?? 4.8), [Validators.required, Validators.min(0), Validators.max(5)]],
      reviews: [Number(data?.reviews ?? 0), [Validators.required, Validators.min(0)]],
      phones: this.fb.array((data?.phones || []).map(phone => this.fb.control(phone))),
      openingHours: this.fb.array((data?.openingHours || []).map(item => this.fb.group({
        day: [item.day || '', Validators.required],
        hours: [item.hours || '', Validators.required]
      })))
    });
  }

  addBusinessLocation(data?: Partial<BusinessLocationValue>) {
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
    this.firebaseService.listenToPath<TaxonomyItem>('taxonomy_business', (data) => {
        this.categories.set(data.sort((a,b) => a.name.localeCompare(b.name)));
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
      this.rebuildAllLocationCityOptions();
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.currentId = id;
      this.loadData(id);
      window.scrollTo(0, 0);
    } else {
      this.addBusinessLocation({
        isPrimary: true,
        phones: [''],
        openingHours: [
          { day: 'Mon - Fri', hours: '9:00 AM - 6:00 PM' },
          { day: 'Sat - Sun', hours: 'Closed' }
        ]
      });
    }
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

        this.businessLocationsArray.clear();
        const savedLocations = Array.isArray(doc.locations) && doc.locations.length > 0
          ? doc.locations
          : [{
              location: doc.location || '',
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
      this.router.navigate(['/businesses']);
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

  async onMainImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const rawFile = input.files[0];
    this.isUploading.set(true);
    try {
      const file = await optimizeImage(rawFile);
      const path = `businesses/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.form.patchValue({ imageUrl: url });
    } catch (e) {
      this.toastService.error('Upload failed');
    } finally {
      this.isUploading.set(false);
    }
  }

  async onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const rawFile = input.files[0];
    this.isUploading.set(true);
    try {
      const file = await optimizeImage(rawFile, 500); 
      const path = `businesses/logos/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.form.patchValue({ logoUrl: url });
    } catch (e) {
      this.toastService.error('Logo upload failed');
    } finally {
      this.isUploading.set(false);
    }
  }

  async onMenuFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
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
    const trimmedAddress = String(address ?? this.getLocationGroup(index)?.get('location')?.value ?? '').trim();
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
    const address = String(this.getLocationGroup(index)?.get('location')?.value || '').trim();
    if (!address) {
      this.toastService.error('Please enter an address first.');
      return;
    }

    await this.resolveGooglePlaceFromAddress(index, address, true);
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Please fill in all required fields');
      return;
    }

    const raw = this.form.getRawValue();
    if (!Array.isArray(raw.businessLocations) || raw.businessLocations.length === 0) {
      this.toastService.error('Please add at least one business location.');
      return;
    }

    const normalizedLocations = raw.businessLocations
      .map((item: any) => ({
        isPrimary: !!item.isPrimary,
        location: String(item.location || '').trim(),
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
              .filter((hour: { day: string; hours: string }) => hour.day || hour.hours)
          : []
      }))
      .filter((item: BusinessLocationValue) => item.location);

    if (normalizedLocations.length === 0) {
      this.toastService.error('Please add at least one valid business location.');
      return;
    }

    for (let index = 0; index < normalizedLocations.length; index += 1) {
      const item = normalizedLocations[index];
      if (!item.googlePlaceId && item.location) {
        await this.resolveGooglePlaceFromAddress(index, item.location, false);
        const refreshed = this.getLocationGroup(index)?.getRawValue();
        normalizedLocations[index] = {
          ...item,
          googlePlaceId: String(refreshed?.googlePlaceId || '').trim(),
          rating: Number(refreshed?.rating ?? item.rating),
          reviews: Number(refreshed?.reviews ?? item.reviews)
        };
      }
    }

    const primaryIndex = Math.max(0, normalizedLocations.findIndex((item: BusinessLocationValue) => item.isPrimary));
    normalizedLocations.forEach((item: BusinessLocationValue, index: number) => {
      item.isPrimary = index === primaryIndex;
    });
    const primaryLocation = normalizedLocations[primaryIndex];

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
      services: raw.services ? raw.services.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      contact: {
        phones: primaryLocation.phones || [],
        website: raw.contactWebsite,
        instagram: raw.contactInstagram,
        facebook: raw.contactFacebook,
        tiktok: raw.contactTiktok
      },
      openingHours: primaryLocation.openingHours || [],
      deliveryInfo: raw.deliveryInfo,
      actionType: raw.actionType,
      actionTarget: raw.actionTarget
    };

    if (!this.isEditing()) {
       (dataToSave as any).createdDate = new Date().toISOString();
       (dataToSave as any).publishedDate = new Date().toISOString();
    }

    try {
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('businesses', this.currentId, dataToSave);
        this.toastService.success('Business updated');
      } else {
        await this.firebaseService.create('businesses', dataToSave);
        this.toastService.success('Business created');
      }
      this.router.navigate(['/businesses']);
    } catch (e: any) {
      this.toastService.error('Save failed: ' + e.message);
    }
  }
}
