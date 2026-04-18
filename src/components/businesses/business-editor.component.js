var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RichTextEditorComponent } from '../ui/rich-text-editor.component';
import { optimizeImage } from '../../utils/image-optimizer';
let BusinessEditorComponent = class BusinessEditorComponent {
    constructor(authService, firebaseService, toastService, route, router, fb) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.route = route;
        this.router = router;
        this.fb = fb;
        this.isEditing = signal(false);
        this.isUploading = signal(false);
        this.activeEditorTab = signal('details');
        this.currentId = null;
        this.locations = signal([]);
        this.availableCities = signal([]);
        this.categories = signal([]);
        this.categorySearch = signal('');
        this.showCategoryDropdown = signal(false);
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
    get openingHoursArray() { return this.form.get('openingHours'); }
    get deliveryInfoArray() { return this.form.get('deliveryInfo'); }
    get phonesArray() { return this.form.get('contactPhones'); }
    filteredCategories() {
        const search = this.categorySearch().toLowerCase();
        return this.categories().filter(c => c.name.toLowerCase().includes(search));
    }
    selectCategory(name) {
        this.form.patchValue({ category: name });
        this.categorySearch.set(name);
        this.showCategoryDropdown.set(false);
        this.syncTypeWithCategory();
        console.log(name);
    }
    onCategoryInput(event) {
        const val = event.target.value;
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
    addOpeningHourRow(day = '', hours = '') {
        this.openingHoursArray.push(this.fb.group({
            day: [day, Validators.required],
            hours: [hours, Validators.required]
        }));
    }
    removeOpeningHourRow(index) {
        this.openingHoursArray.removeAt(index);
    }
    addDeliveryInfoRow(location = '', charge = '') {
        this.deliveryInfoArray.push(this.fb.group({
            location: [location, Validators.required],
            charge: [charge, Validators.required]
        }));
    }
    removeDeliveryInfoRow(index) {
        this.deliveryInfoArray.removeAt(index);
    }
    addPhone(value = '') {
        this.phonesArray.push(this.fb.control(value));
    }
    removePhone(index) {
        this.phonesArray.removeAt(index);
    }
    ngOnInit() {
        this.firebaseService.listenToPath('taxonomy_business', (data) => {
            this.categories.set(data.sort((a, b) => a.name.localeCompare(b.name)));
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
            this.updateCitiesForCountry('AE');
        });
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditing.set(true);
            this.currentId = id;
            this.loadData(id);
            window.scrollTo(0, 0);
        }
        else {
            // Init Default Hours and Phone for new entry
            this.addOpeningHourRow('Mon - Fri', '9:00 AM - 6:00 PM');
            this.addOpeningHourRow('Sat - Sun', 'Closed');
            this.addPhone();
        }
    }
    async loadData(id) {
        try {
            const doc = await this.firebaseService.getDocument('businesses', id);
            if (doc) {
                if (doc.countryCode)
                    this.updateCitiesForCountry(doc.countryCode);
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
                // Phones logic
                this.phonesArray.clear();
                if (doc.contact?.phones && Array.isArray(doc.contact.phones)) {
                    doc.contact.phones.forEach((p) => this.addPhone(p));
                }
                else if (doc.contact?.phone) {
                    this.addPhone(doc.contact.phone);
                }
                else {
                    this.addPhone();
                }
                this.openingHoursArray.clear();
                if (doc.openingHours && Array.isArray(doc.openingHours)) {
                    doc.openingHours.forEach((oh) => this.addOpeningHourRow(oh.day, oh.hours));
                }
                else {
                    this.addOpeningHourRow('Mon - Fri', '9:00 AM - 6:00 PM');
                }
                this.deliveryInfoArray.clear();
                if (doc.deliveryInfo && Array.isArray(doc.deliveryInfo)) {
                    doc.deliveryInfo.forEach((di) => this.addDeliveryInfoRow(di.location, di.charge));
                }
            }
        }
        catch (e) {
            this.toastService.error('Failed to load business data');
            this.router.navigate(['/businesses']);
        }
    }
    onCountryChange() {
        const code = this.form.get('countryCode')?.value;
        this.updateCitiesForCountry(code);
        const cities = this.availableCities();
        if (cities.length > 0)
            this.form.patchValue({ cityCode: cities[0].code });
        else
            this.form.patchValue({ cityCode: '' });
    }
    updateCitiesForCountry(countryCode) {
        const country = this.locations().find(c => c.code === countryCode);
        this.availableCities.set(country ? country.cities : []);
    }
    async onMainImageSelected(event) {
        const input = event.target;
        if (!input.files?.length)
            return;
        const rawFile = input.files[0];
        this.isUploading.set(true);
        try {
            const file = await optimizeImage(rawFile);
            const path = `businesses/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
            const url = await this.firebaseService.uploadFile(path, file);
            this.form.patchValue({ imageUrl: url });
        }
        catch (e) {
            this.toastService.error('Upload failed');
        }
        finally {
            this.isUploading.set(false);
        }
    }
    async onLogoSelected(event) {
        const input = event.target;
        if (!input.files?.length)
            return;
        const rawFile = input.files[0];
        this.isUploading.set(true);
        try {
            const file = await optimizeImage(rawFile, 500);
            const path = `businesses/logos/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
            const url = await this.firebaseService.uploadFile(path, file);
            this.form.patchValue({ logoUrl: url });
        }
        catch (e) {
            this.toastService.error('Logo upload failed');
        }
        finally {
            this.isUploading.set(false);
        }
    }
    async onMenuFileSelected(event) {
        const input = event.target;
        if (!input.files?.length)
            return;
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
        }
        catch (e) {
            this.toastService.error('Catalog upload failed');
        }
        finally {
            this.isUploading.set(false);
        }
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
            services: raw.services ? raw.services.split(',').map((s) => s.trim()).filter(Boolean) : [],
            contact: {
                phones: raw.contactPhones.filter((p) => p && p.trim() !== ''),
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
            dataToSave.createdDate = new Date().toISOString();
            dataToSave.publishedDate = new Date().toISOString();
        }
        try {
            if (this.isEditing() && this.currentId) {
                await this.firebaseService.update('businesses', this.currentId, dataToSave);
                this.toastService.success('Business updated');
            }
            else {
                await this.firebaseService.create('businesses', dataToSave);
                this.toastService.success('Business created');
            }
            this.router.navigate(['/businesses']);
        }
        catch (e) {
            this.toastService.error('Save failed: ' + e.message);
        }
    }
};
BusinessEditorComponent = __decorate([
    Component({
        selector: 'app-business-editor',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
        templateUrl: './business-editor.component.html'
    })
], BusinessEditorComponent);
export { BusinessEditorComponent };
