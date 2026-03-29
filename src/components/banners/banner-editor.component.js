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
let BannerEditorComponent = class BannerEditorComponent {
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
        this.form = this.fb.group({
            title: ['', Validators.required],
            image: ['', Validators.required],
            description: [''],
            isActive: [true],
            isHomeBanner: [false],
            tag: [''],
            icon: [''],
            navigationType: ['none'],
            targetId: [''],
            publishedDate: [''],
            publishedBy: [''],
            content: ['']
        });
        // Listen to navigation type changes to control targetId validation/state
        this.form.get('navigationType')?.valueChanges.subscribe(type => {
            this.updateTargetIdState(type);
        });
    }
    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditing.set(true);
            this.currentId = id;
            this.loadData(id);
        }
        else {
            // Init state for new banners
            this.updateTargetIdState('none');
        }
    }
    updateTargetIdState(type) {
        const targetControl = this.form.get('targetId');
        if (type === 'external' || type === 'internal') {
            targetControl?.setValidators([Validators.required]);
            targetControl?.enable();
        }
        else {
            targetControl?.clearValidators();
            targetControl?.disable();
            targetControl?.setValue('');
        }
        targetControl?.updateValueAndValidity();
    }
    async loadData(id) {
        try {
            const doc = await this.firebaseService.getDocument('banners', id);
            if (doc) {
                this.form.patchValue(doc);
                // Force update of validation state based on loaded type
                this.updateTargetIdState(doc.navigationType || 'none');
            }
        }
        catch (e) {
            this.toastService.error('Failed to load banner');
            this.router.navigate(['/banners']);
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
            const path = `banners/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
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
        const dataToSave = this.form.getRawValue();
        // Auto-set order if new and not present
        if (!this.isEditing() && !dataToSave.order) {
            dataToSave.order = 9999; // Default to end of list, reorder tool handles fixes
        }
        try {
            if (this.isEditing() && this.currentId) {
                await this.firebaseService.update('banners', this.currentId, dataToSave);
                this.toastService.success('Banner updated');
            }
            else {
                await this.firebaseService.create('banners', dataToSave);
                this.toastService.success('Banner created');
            }
            this.router.navigate(['/banners']);
        }
        catch (e) {
            this.toastService.error('Save failed: ' + e.message);
        }
    }
};
BannerEditorComponent = __decorate([
    Component({
        selector: 'app-banner-editor',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
        templateUrl: './banner-editor.component.html'
    })
], BannerEditorComponent);
export { BannerEditorComponent };
