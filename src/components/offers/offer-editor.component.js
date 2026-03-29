var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RichTextEditorComponent } from '../ui/rich-text-editor.component';
import { optimizeImage } from '../../utils/image-optimizer';
let OfferEditorComponent = class OfferEditorComponent {
    constructor(authService, firebaseService, toastService, route, router, fb) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.route = route;
        this.router = router;
        this.fb = fb;
        this.isEditing = signal(false);
        this.isUploading = signal(false);
        this.currentId = null;
        // Data Sources
        this.categories = signal([]);
        this.businesses = signal([]);
        this.sortedBusinesses = computed(() => this.businesses().sort((a, b) => a.title.localeCompare(b.title)));
        this.form = this.fb.group({
            title: ['', Validators.required],
            image: ['', Validators.required],
            generalCategory: ['Food', Validators.required],
            categories: [[], Validators.required], // Changed to empty array
            description: [''],
            content: [''],
            isActive: [true],
            // Display Options
            isHomeBanner: [false],
            isSectionBanner: [false],
            isFeatured: [false],
            isPremium: [false],
            // Link Config
            linkType: ['none', Validators.required],
            targetId: [''],
            // External link field (used if linkType is external)
            externalUrl: [''],
            tag: [''],
            publishedDate: [new Date().toISOString().slice(0, 10)],
            publishedBy: ['']
        });
        // Handle Link Type Changes to manage Target ID validity
        this.form.get('linkType')?.valueChanges.subscribe(type => {
            this.updateFormStateForType(type);
        });
    }
    updateFormStateForType(type) {
        const targetControl = this.form.get('targetId');
        const urlControl = this.form.get('externalUrl');
        // Check for business tab key
        const isBusiness = type === 'businesses';
        const isExternal = type === 'external';
        if (isBusiness) {
            targetControl?.setValidators(Validators.required);
            targetControl?.enable();
            urlControl?.clearValidators();
            urlControl?.disable();
        }
        else if (isExternal) {
            urlControl?.setValidators(Validators.required);
            urlControl?.enable();
            targetControl?.clearValidators();
            targetControl?.disable();
        }
        else {
            // For 'none' or other category tabs that don't need a specific ID (just link to tab)
            targetControl?.clearValidators();
            targetControl?.disable();
            urlControl?.clearValidators();
            urlControl?.disable();
        }
        targetControl?.updateValueAndValidity();
        urlControl?.updateValueAndValidity();
    }
    ngOnInit() {
        // Load dropdown data
        this.firebaseService.listenToPath('taxonomy_business', (data) => {
            const filteredData = data.filter((cat) => cat.name !== 'Popular' &&
                cat.name !== 'Featured' &&
                cat.name !== 'Food');
            this.categories.set(filteredData.sort((a, b) => a.name.localeCompare(b.name)));
        });
        this.firebaseService.listenToPath('businesses', (data) => this.businesses.set(data));
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditing.set(true);
            this.currentId = id;
            this.loadData(id);
        }
        else {
            this.form.patchValue({ publishedBy: this.authService.currentUser()?.name || 'Admin' });
            this.updateFormStateForType('none');
        }
    }
    async loadData(id) {
        try {
            const doc = await this.firebaseService.getDocument('offers', id);
            if (doc) {
                // Map targetId back to form if it's an external link
                let formData = { ...doc };
                if (doc.linkType === 'external') {
                    formData.externalUrl = doc.targetId;
                    formData.targetId = '';
                }
                // Ensure categories has a value if missing in old data
                if (!formData.categories) {
                    // Fallback for old data that might have used 'category' string
                    if (doc.category) {
                        formData.categories = [doc.category];
                    }
                    else {
                        formData.categories = [];
                    }
                }
                // Fallback for generalCategory
                if (!formData.generalCategory) {
                    formData.generalCategory = doc.category || 'Food';
                }
                this.form.patchValue(formData);
                this.updateFormStateForType(doc.linkType);
            }
        }
        catch (e) {
            this.toastService.error('Failed to load offer');
            this.router.navigate(['/offers']);
        }
    }
    toggleCategory(name) {
        const current = this.form.get('categories')?.value || [];
        if (current.includes(name)) {
            this.form.patchValue({ categories: current.filter((c) => c !== name) });
        }
        else {
            this.form.patchValue({ categories: [...current, name] });
        }
    }
    onEntitySelect(event) {
        // If a user selects a restaurant/business, maybe auto-fill title/image if empty?
        const select = event.target;
        const id = select.value;
        if (!id)
            return;
        const currentTitle = this.form.get('title')?.value;
        const currentImage = this.form.get('image')?.value;
        // Only auto-fill if empty to avoid overwriting edits
        if (!currentTitle || !currentImage) {
            const type = this.form.get('linkType')?.value;
            let found;
            const isBusiness = type === 'businesses';
            if (isBusiness)
                found = this.businesses().find(b => b.id === id);
            if (found) {
                if (!currentTitle)
                    this.form.patchValue({ title: found.title });
                if (!currentImage)
                    this.form.patchValue({ image: found.imageUrl });
            }
        }
    }
    async onFileSelected(event) {
        const input = event.target;
        if (!input.files?.length)
            return;
        const rawFile = input.files[0];
        this.isUploading.set(true);
        try {
            const file = await optimizeImage(rawFile);
            const path = `offers/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
            const url = await this.firebaseService.uploadFile(path, file);
            this.form.patchValue({ image: url });
        }
        catch (e) {
            this.toastService.error('Upload failed');
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
            return;
        }
        const raw = this.form.getRawValue();
        const linkType = raw.linkType;
        // Normalize targetId
        let finalTargetId = raw.targetId;
        let finalTargetName = '';
        const isBusiness = linkType === 'businesses';
        if (linkType === 'external') {
            finalTargetId = raw.externalUrl;
            finalTargetName = 'External Link';
        }
        else if (isBusiness) {
            const b = this.businesses().find(i => i.id === raw.targetId);
            finalTargetName = b ? b.title : 'Unknown Business';
        }
        else {
            // For 'none'
            finalTargetName = 'No Link';
            finalTargetId = '';
        }
        const dataToSave = {
            title: raw.title,
            image: raw.image,
            generalCategory: raw.generalCategory,
            categories: raw.isSectionBanner ? (raw.categories || []).filter((c) => c !== 'Food') : [],
            description: raw.description,
            content: raw.content,
            isActive: raw.isActive,
            // Display Flags
            isHomeBanner: raw.isHomeBanner,
            isSectionBanner: raw.isSectionBanner,
            linkType: linkType,
            targetId: finalTargetId,
            targetName: finalTargetName,
            tag: raw.tag,
            publishedDate: raw.publishedDate,
            publishedBy: raw.publishedBy
        };
        // Auto-order if new
        if (!this.isEditing()) {
            dataToSave.order = 9999;
        }
        try {
            if (this.isEditing() && this.currentId) {
                await this.firebaseService.update('offers', this.currentId, dataToSave);
                this.toastService.success('Offer updated');
            }
            else {
                await this.firebaseService.create('offers', dataToSave);
                this.toastService.success('Offer created');
            }
            this.router.navigate(['/offers']);
        }
        catch (e) {
            this.toastService.error('Save failed: ' + e.message);
        }
    }
};
OfferEditorComponent = __decorate([
    Component({
        selector: 'app-offer-editor',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
        templateUrl: './offer-editor.component.html'
    })
], OfferEditorComponent);
export { OfferEditorComponent };
