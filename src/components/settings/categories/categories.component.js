var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ModalComponent } from '../../ui/modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
let CategoriesComponent = class CategoriesComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.fb = inject(FormBuilder);
        this.categories = signal([]);
        this.searchQuery = signal('');
        this.filteredCategories = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const list = this.categories().sort((a, b) => (a.order || 0) - (b.order || 0));
            if (!query)
                return list;
            return list.filter(c => c.label?.toLowerCase().includes(query) ||
                c.tab?.toLowerCase().includes(query));
        });
        // Modal State
        this.showModal = signal(false);
        this.isEditing = signal(false);
        this.isUploading = signal(false);
        this.currentId = null;
        this.errorMessage = signal(null);
        // Confirmation State
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
        // Drag State
        this.draggedIndex = null;
        this.form = this.fb.group({
            label: ['', Validators.required],
            icon: ['', Validators.required],
            tab: ['', Validators.required],
            order: [1, [Validators.required, Validators.min(1)]],
            hasNotification: [false],
            isActive: [true]
        });
    }
    ngOnInit() {
        this.firebaseService.listenToPath('categories', (data) => {
            // Ensure isActive is boolean (default true if missing)
            const filteredData = data.filter(c => c.label !== 'Popular' && c.label !== 'Featured');
            const sanitized = filteredData.map(c => ({
                ...c,
                isActive: c.isActive !== false
            }));
            this.categories.set(sanitized);
        });
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
    }
    // --- Show/Hide (Active Status) ---
    async toggleStatus(category, event) {
        event.stopPropagation(); // Prevent row click or drag start
        if (!this.authService.isAdmin()) {
            this.toastService.error('Unauthorized');
            return;
        }
        const newStatus = !category.isActive;
        // Optimistic update locally
        this.categories.update(cats => cats.map(c => c.id === category.id ? { ...c, isActive: newStatus } : c));
        try {
            await this.firebaseService.update('categories', category.id, { isActive: newStatus });
            this.toastService.success(`Category ${newStatus ? 'Visible' : 'Hidden'}`);
        }
        catch (e) {
            console.error(e);
            // Revert on error
            this.categories.update(cats => cats.map(c => c.id === category.id ? { ...c, isActive: !newStatus } : c));
            this.toastService.error('Failed to update status');
        }
    }
    // --- Drag & Drop Reordering ---
    onDragStart(event, index) {
        if (this.searchQuery()) {
            event.preventDefault();
            return;
        }
        this.draggedIndex = index;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', index.toString());
        }
    }
    onDragOver(event) {
        if (this.searchQuery())
            return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }
    async onDrop(event, dropIndex) {
        if (this.searchQuery())
            return;
        event.preventDefault();
        if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
            this.draggedIndex = null;
            return;
        }
        const currentCats = [...this.filteredCategories()];
        const [draggedItem] = currentCats.splice(this.draggedIndex, 1);
        currentCats.splice(dropIndex, 0, draggedItem);
        const updates = [];
        const updatedFullList = [...this.categories()];
        currentCats.forEach((cat, index) => {
            const newOrder = index + 1;
            if (cat.order !== newOrder) {
                cat.order = newOrder;
                updates.push(this.firebaseService.update('categories', cat.id, { order: newOrder }));
                // Update local ref
                const match = updatedFullList.find(c => c.id === cat.id);
                if (match)
                    match.order = newOrder;
            }
        });
        this.categories.set(updatedFullList);
        this.draggedIndex = null;
        if (updates.length > 0) {
            try {
                await Promise.all(updates);
                this.toastService.success('Order updated');
            }
            catch (e) {
                console.error(e);
                this.toastService.error('Failed to save new order');
            }
        }
    }
    // --- Create / Edit ---
    openModal() {
        if (!this.authService.isAdmin()) {
            this.toastService.error("Unauthorized: Only admins can manage categories.");
            return;
        }
        this.isEditing.set(false);
        this.isUploading.set(false);
        this.currentId = null;
        this.errorMessage.set(null);
        const maxOrder = this.categories().reduce((max, c) => Math.max(max, c.order || 0), 0);
        this.form.reset({
            label: '',
            icon: '',
            tab: '',
            order: maxOrder + 1,
            hasNotification: false,
            isActive: true
        });
        this.showModal.set(true);
    }
    edit(item) {
        if (!this.authService.isAdmin())
            return;
        this.isEditing.set(true);
        this.isUploading.set(false);
        this.currentId = item.id;
        this.errorMessage.set(null);
        this.form.patchValue({
            ...item,
            isActive: item.isActive !== false // Handle missing field as true
        });
        this.showModal.set(true);
    }
    closeModal() {
        this.showModal.set(false);
    }
    async onFileSelected(event) {
        const input = event.target;
        if (!input.files || input.files.length === 0)
            return;
        const file = input.files[0];
        this.isUploading.set(true);
        this.errorMessage.set(null);
        try {
            const path = `categories/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const url = await this.firebaseService.uploadFile(path, file);
            this.form.patchValue({ icon: url });
        }
        catch (e) {
            this.errorMessage.set('Image upload failed.');
            this.toastService.error('Image upload failed.');
        }
        finally {
            this.isUploading.set(false);
        }
    }
    async save() {
        if (!this.authService.isAdmin()) {
            this.errorMessage.set("Unauthorized.");
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const formValue = this.form.getRawValue();
        const dataToSave = { ...formValue };
        try {
            if (this.isEditing() && this.currentId) {
                // Update
                await this.firebaseService.update('categories', this.currentId, dataToSave);
                this.toastService.success('Category updated successfully.');
            }
            else {
                // Create
                const newId = `cat-${Date.now()}`;
                await this.firebaseService.set(`categories/${newId}`, { ...dataToSave, id: newId });
                this.toastService.success('Category created successfully.');
            }
            this.closeModal();
        }
        catch (e) {
            this.errorMessage.set(e.message);
            this.toastService.error('Save failed: ' + e.message);
        }
    }
    // --- Delete ---
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
            await this.firebaseService.delete('categories', id);
            this.toastService.success('Category deleted successfully.');
        }
        catch (e) {
            this.toastService.error('Delete failed: ' + e.message);
        }
        finally {
            this.closeConfirmModal();
        }
    }
};
CategoriesComponent = __decorate([
    Component({
        selector: 'app-categories',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
        templateUrl: './categories.component.html'
    })
], CategoriesComponent);
export { CategoriesComponent };
