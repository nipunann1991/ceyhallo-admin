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
let NewsEditorComponent = class NewsEditorComponent {
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
            excerpt: ['', Validators.required],
            content: ['', Validators.required],
            imageUrl: [''],
            publishedDate: [new Date().toISOString().slice(0, 16), Validators.required],
            author: ['', Validators.required],
            category: ['', Validators.required],
            isFeatured: [false],
            isPublished: [true],
            isNewsPageBanner: [false]
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
            this.form.patchValue({
                author: this.authService.currentUser()?.name || 'Admin'
            });
        }
    }
    async loadData(id) {
        try {
            const doc = await this.firebaseService.getDocument('news', id);
            if (doc) {
                this.form.patchValue(doc);
            }
        }
        catch (e) {
            this.toastService.error('Failed to load news');
            this.router.navigate(['/news']);
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
            const path = `news/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
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
        if (!this.isEditing()) {
            dataToSave.createdDate = new Date().toISOString();
        }
        try {
            if (this.isEditing() && this.currentId) {
                await this.firebaseService.update('news', this.currentId, dataToSave);
                this.toastService.success('News updated');
            }
            else {
                await this.firebaseService.create('news', dataToSave);
                this.toastService.success('News created');
            }
            this.router.navigate(['/news']);
        }
        catch (e) {
            this.toastService.error('Save failed: ' + e.message);
        }
    }
};
NewsEditorComponent = __decorate([
    Component({
        selector: 'app-news-editor',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
        templateUrl: './news-editor.component.html'
    })
], NewsEditorComponent);
export { NewsEditorComponent };
