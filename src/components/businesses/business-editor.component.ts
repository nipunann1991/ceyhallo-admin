
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
  currentId: string | null = null;
  
  locations = signal<any[]>([]);
  availableCities = signal<{code: string, name: string}[]>([]);
  categories = signal<TaxonomyItem[]>([]);
  categorySearch = signal('');
  showCategoryDropdown = signal(false);
  googleReviewStats = signal<GoogleReviewStats | null>(null);
  googleReviewLoading = signal(false);
  googleReviewError = signal('');
  googleMapEmbedUrl = signal<SafeResourceUrl | null>(null);

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
      location: ['', Validators.required],
      imageUrl: [''],
      logoUrl: [''], 
      menuUrl: [''], // Added catalog/menu URL
      googlePlaceId: [''],
      rating: [4.8, [Validators.required, Validators.min(0), Validators.max(5)]],
      reviews: [0, [Validators.required, Validators.min(0)]],
      countryCode: ['AE', Validators.required],
      cityCode: ['DXB', Validators.required],
      isPublished: [true], 
      isPremium: [false],
      isVerified: [false],
      isFeatured: [false],
      isDeliveryAvailable: [false],
      isArchived: [false],
      services: [''],
      
      // Contact
      contactPhones: this.fb.array([]),
      contactWebsite: [''],
      contactInstagram: [''],
      contactFacebook: [''],
      contactTiktok: [''],
      
      // Booking & Action
      actionType: ['none'],
      actionTarget: [''],

      openingHours: this.fb.array([]),
      deliveryInfo: this.fb.array([])
    });

    // Auto-unpublish when archived
    this.form.get('isArchived')?.valueChanges.subscribe(isArchived => {
      if (isArchived) {
        this.form.patchValue({ isPublished: false });
      }
    });
  }

  get openingHoursArray() { return this.form.get('openingHours') as FormArray; }
  get deliveryInfoArray() { return this.form.get('deliveryInfo') as FormArray; }
  get phonesArray() { return this.form.get('contactPhones') as FormArray; }

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

  addOpeningHourRow(day: string = '', hours: string = '') {
    this.openingHoursArray.push(this.fb.group({
      day: [day, Validators.required],
      hours: [hours, Validators.required]
    }));
  }

  removeOpeningHourRow(index: number) {
    this.openingHoursArray.removeAt(index);
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

  addPhone(value: string = '') {
    this.phonesArray.push(this.fb.control(value));
  }
  removePhone(index: number) {
    this.phonesArray.removeAt(index);
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
      this.updateCitiesForCountry('AE');
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.currentId = id;
      this.loadData(id);
      window.scrollTo(0, 0);
    } else {
      // Init Default Hours and Phone for new entry
      this.addOpeningHourRow('Mon - Fri', '9:00 AM - 6:00 PM');
      this.addOpeningHourRow('Sat - Sun', 'Closed');
      this.addPhone();
    }
  }

  async loadData(id: string) {
    try {
      const doc = await this.firebaseService.getDocument('businesses', id);
      if (doc) {
        if (doc.countryCode) this.updateCitiesForCountry(doc.countryCode);
        
        const formData = {
           title: doc.title,
           description: doc.description,
           category: doc.category,
           type: doc.type || '',
           useCategoryAsType: doc.type === doc.category && !!doc.category,
           priceRange: doc.priceRange || '',
           location: doc.location,
           imageUrl: doc.imageUrl,
           logoUrl: doc.logoUrl || '',
           menuUrl: doc.menuUrl || '', // Load catalog URL
           googlePlaceId: doc.googlePlaceId || '',
           rating: doc.rating,
           reviews: doc.reviews,
           countryCode: doc.countryCode || 'AE',
           cityCode: doc.cityCode || '',
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
        if (doc.googlePlaceId) {
          this.fetchGoogleReviewStats(doc.googlePlaceId, false);
        }

        // Phones logic
        this.phonesArray.clear();
        if (doc.contact?.phones && Array.isArray(doc.contact.phones)) {
           doc.contact.phones.forEach((p: string) => this.addPhone(p));
        } else if (doc.contact?.phone) {
           this.addPhone(doc.contact.phone);
        } else {
           this.addPhone();
        }

        this.openingHoursArray.clear();
        if (doc.openingHours && Array.isArray(doc.openingHours)) {
           doc.openingHours.forEach((oh: any) => this.addOpeningHourRow(oh.day, oh.hours));
        } else {
           this.addOpeningHourRow('Mon - Fri', '9:00 AM - 6:00 PM');
        }

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

  onCountryChange() {
    const code = this.form.get('countryCode')?.value;
    this.updateCitiesForCountry(code);
    const cities = this.availableCities();
    if (cities.length > 0) this.form.patchValue({ cityCode: cities[0].code });
    else this.form.patchValue({ cityCode: '' });
  }

  updateCitiesForCountry(countryCode: string) {
    const country = this.locations().find(c => c.code === countryCode);
    this.availableCities.set(country ? country.cities : []);
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

  async fetchGoogleReviewStats(placeId?: string, showToast = true) {
    const googlePlaceId = (placeId ?? this.form.get('googlePlaceId')?.value ?? '').trim();
    if (!googlePlaceId) {
      this.googleReviewError.set('Add a Google Place ID to fetch live reviews.');
      this.googleReviewStats.set(null);
      return;
    }

    this.googleReviewLoading.set(true);
    this.googleReviewError.set('');
    try {
      const result = await this.firebaseService.callFunction('fetchGooglePlaceDetails', { placeId: googlePlaceId });
      if (result?.success === false) {
        throw new Error(result?.message || 'Failed to fetch Google review stats.');
      }
      const rating = Number(result?.rating ?? 0);
      const reviews = Number(result?.reviews ?? 0);

      this.googleReviewStats.set({
        rating,
        reviews,
        name: result?.name
      });

      const lat = Number(result?.lat);
      const lng = Number(result?.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const embedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
        this.googleMapEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
      } else {
        this.googleMapEmbedUrl.set(null);
      }

      this.form.patchValue({
        rating,
        reviews
      });
      if (showToast) {
        this.toastService.success('Google review stats loaded.');
      }
    } catch (e: any) {
      this.googleReviewStats.set(null);
      this.googleReviewError.set(e?.message || 'Failed to fetch Google review stats.');
      if (showToast) {
        this.toastService.error(this.googleReviewError());
      }
    } finally {
      this.googleReviewLoading.set(false);
    }
  }

  async resolveGooglePlaceFromAddress(address?: string, showToast = true) {
    const trimmedAddress = String(address ?? this.form.get('location')?.value ?? '').trim();
    if (!trimmedAddress) {
      return null;
    }

    this.googleReviewLoading.set(true);
    this.googleReviewError.set('');
    try {
      const result = await this.firebaseService.callFunction('resolveGooglePlaceFromAddress', {
        address: trimmedAddress,
        countryCode: this.form.get('countryCode')?.value || 'AE'
      });

      if (result?.success === false) {
        throw new Error(result?.message || 'Failed to resolve address.');
      }

      const placeId = String(result?.placeId || '').trim();
      if (!placeId) {
        throw new Error('No Google Place ID was returned for this address.');
      }

      this.form.patchValue({ googlePlaceId: placeId }, { emitEvent: false });
      await this.fetchGoogleReviewStats(placeId, false);
      return result;
    } catch (e: any) {
      this.googleReviewError.set(e?.message || 'Failed to resolve Google Place ID from the address.');
      this.googleReviewStats.set(null);
      if (showToast) {
        this.toastService.error(this.googleReviewError());
      }
      return null;
    } finally {
      this.googleReviewLoading.set(false);
    }
  }

  async fetchMapAndReviews() {
    const address = String(this.form.get('location')?.value || '').trim();
    if (!address) {
      this.toastService.error('Please enter an address first.');
      return;
    }

    await this.resolveGooglePlaceFromAddress(address, true);
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
    if ((!raw.googlePlaceId || !String(raw.googlePlaceId).trim()) && raw.location) {
      await this.resolveGooglePlaceFromAddress(raw.location, false);
    }

    const dataToSave = {
      title: raw.title,
      description: raw.description,
      category: raw.category,
      type: raw.type,
      priceRange: raw.priceRange,
      location: raw.location,
      imageUrl: raw.imageUrl,
      logoUrl: raw.logoUrl,
      menuUrl: raw.menuUrl, // Save catalog URL
      googlePlaceId: String(this.form.get('googlePlaceId')?.value || raw.googlePlaceId || '').trim(),
      rating: Number(raw.rating),
      reviews: Number(raw.reviews),
      countryCode: raw.countryCode,
      cityCode: raw.cityCode,
      isPublished: raw.isPublished,
      isPremium: raw.isPremium,
      isVerified: raw.isVerified,
      isFeatured: raw.isFeatured,
      isDeliveryAvailable: raw.isDeliveryAvailable,
      isArchived: raw.isArchived,
      services: raw.services ? raw.services.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      contact: {
        phones: raw.contactPhones.filter((p: string) => p && p.trim() !== ''),
        website: raw.contactWebsite,
        instagram: raw.contactInstagram,
        facebook: raw.contactFacebook,
        tiktok: raw.contactTiktok
      },
      openingHours: raw.openingHours,
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
