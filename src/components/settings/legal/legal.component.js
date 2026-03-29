var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Quill from 'quill';
let LegalComponent = class LegalComponent {
    constructor(authService, firebaseService, toastService, fb) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.fb = fb;
        this.route = inject(ActivatedRoute);
        this.docId = signal('');
        this.title = signal('');
        this.isSaving = signal(false);
        this.lastUpdated = signal(null);
        this.updatedBy = signal(null);
        this.showSource = signal(false);
        this.form = this.fb.group({
            content: ['', Validators.required]
        });
    }
    ngOnInit() {
        // Get docId and title from route data
        const data = this.route.snapshot.data;
        if (data['docId']) {
            this.docId.set(data['docId']);
        }
        if (data['title']) {
            this.title.set(data['title']);
        }
        this.loadData();
    }
    ngAfterViewInit() {
        if (this.editorContainer) {
            this.quill = new Quill(this.editorContainer.nativeElement, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link', 'clean']
                    ]
                }
            });
            const currentContent = this.form.get('content')?.value;
            if (currentContent) {
                this.quill.clipboard.dangerouslyPasteHTML(currentContent);
            }
            this.quill.on('text-change', () => {
                if (!this.showSource()) {
                    const html = this.quill.root.innerHTML;
                    this.form.patchValue({ content: html }, { emitEvent: false });
                }
            });
        }
    }
    toggleSource() {
        this.showSource.update(v => !v);
        if (this.showSource()) {
            const html = this.quill.root.innerHTML;
            this.form.patchValue({ content: html });
        }
        else {
            const html = this.form.get('content')?.value || '';
            if (this.quill) {
                this.quill.clipboard.dangerouslyPasteHTML(html);
            }
        }
    }
    async loadData() {
        try {
            const doc = await this.firebaseService.getDocument('legal', this.docId());
            if (doc) {
                const content = doc.content || '';
                this.form.patchValue({ content });
                this.lastUpdated.set(doc.updatedAt || null);
                this.updatedBy.set(doc.updatedBy || null);
                if (this.quill && !this.showSource()) {
                    if (this.quill.root.innerHTML !== content) {
                        this.quill.clipboard.dangerouslyPasteHTML(content);
                    }
                }
            }
            else {
                this.form.patchValue({ content: '' });
                if (this.quill && !this.showSource())
                    this.quill.root.innerHTML = '';
            }
        }
        catch (e) {
            this.toastService.error(`Failed to load ${this.title()}`);
        }
    }
    async save() {
        if (!this.authService.isAdmin()) {
            this.toastService.error('Unauthorized: Admins only.');
            return;
        }
        this.isSaving.set(true);
        try {
            const data = {
                content: this.form.value.content,
                updatedAt: new Date().toISOString(),
                updatedBy: this.authService.currentUser()?.name
            };
            await this.firebaseService.set(`legal/${this.docId()}`, data);
            this.lastUpdated.set(data.updatedAt);
            this.updatedBy.set(data.updatedBy || null);
            this.toastService.success(`${this.title()} saved successfully.`);
        }
        catch (e) {
            if (e.code === 'permission-denied' || e.message?.includes('PERMISSION_DENIED')) {
                this.toastService.error(`Permission Denied.`);
            }
            else {
                this.toastService.error('Save failed: ' + e.message);
            }
        }
        finally {
            this.isSaving.set(false);
        }
    }
};
__decorate([
    ViewChild('editorContainer')
], LegalComponent.prototype, "editorContainer", void 0);
LegalComponent = __decorate([
    Component({
        selector: 'app-legal',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule],
        templateUrl: './legal.component.html'
    })
], LegalComponent);
export { LegalComponent };
