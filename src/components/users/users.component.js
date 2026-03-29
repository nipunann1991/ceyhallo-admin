var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../ui/modal.component';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
let UsersComponent = class UsersComponent {
    constructor(authService, toastService, firebaseService, fb) {
        this.authService = authService;
        this.toastService = toastService;
        this.firebaseService = firebaseService;
        this.fb = fb;
        this.showTitle = input(true);
        this.users = signal([]);
        this.searchQuery = signal('');
        // Pagination
        this.itemsPerPage = 10;
        this.currentPage = signal(1);
        this.filteredUsers = computed(() => {
            const query = this.searchQuery().toLowerCase();
            return this.users().filter(u => u.name?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query) ||
                u.role?.toLowerCase().includes(query));
        });
        this.paginatedUsers = computed(() => {
            const data = this.filteredUsers();
            const start = (this.currentPage() - 1) * this.itemsPerPage;
            return data.slice(start, start + this.itemsPerPage);
        });
        this.showModal = signal(false);
        this.isEditing = signal(false);
        this.currentId = null;
        this.errorMessage = signal(null);
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
        // Detail View
        this.selectedUser = signal(null);
        this.form = this.fb.group({
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            role: ['user', Validators.required],
            status: ['active', Validators.required],
            region: ['']
        });
    }
    ngOnInit() {
        this.firebaseService.listenToPath('users', (data) => {
            // Map Firebase data to our UI-friendly User model
            const mappedUsers = data.map(user => {
                // Normalize Status: Check explicit status first (case-insensitive), fallback to isVerified
                let displayStatus = 'inactive';
                if (user.status) {
                    const s = user.status.toLowerCase();
                    if (s === 'active')
                        displayStatus = 'active';
                    else if (s === 'blocked')
                        displayStatus = 'blocked';
                    else
                        displayStatus = 'inactive';
                }
                else if (user.isVerified) {
                    displayStatus = 'active';
                }
                // Normalize Role: case-insensitive
                let rawRole = (user.role || 'user').toLowerCase();
                if (!['admin', 'manager', 'user'].includes(rawRole)) {
                    rawRole = 'user';
                }
                return {
                    ...user,
                    status: displayStatus,
                    role: rawRole
                };
            });
            this.users.set(mappedUsers);
        }, (error) => {
            console.error('Error fetching users:', error);
            if (error.code === 'permission-denied') {
                this.toastService.error('Permission denied accessing Users. Check database rules.');
                this.errorMessage.set('Permission denied. Please check Firestore Rules.');
            }
        });
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
        this.currentPage.set(1);
    }
    openModal() {
        if (!this.authService.isAdmin()) {
            alert("Unauthorized: Only admins can add users.");
            return;
        }
        this.isEditing.set(false);
        this.currentId = null;
        this.errorMessage.set(null);
        this.form.reset({ role: 'user', status: 'active', region: '' });
        this.showModal.set(true);
    }
    closeModal() {
        this.showModal.set(false);
    }
    edit(item) {
        if (!this.authService.isAdmin())
            return;
        this.isEditing.set(true);
        this.currentId = item.id;
        this.errorMessage.set(null);
        this.form.patchValue(item);
        this.showModal.set(true);
    }
    viewUser(user) {
        this.selectedUser.set(user);
    }
    closeViewModal() {
        this.selectedUser.set(null);
    }
    async save() {
        if (!this.authService.isAdmin()) {
            this.errorMessage.set("Unauthorized: Only admins can perform this action.");
            return;
        }
        if (this.form.invalid)
            return;
        this.errorMessage.set(null);
        const formValue = this.form.getRawValue();
        // Transform form data back to the Firebase data structure
        const dataToSave = {
            name: formValue.name,
            email: formValue.email,
            role: formValue.role,
            region: formValue.region,
            status: formValue.status, // Save status explicitly
            isVerified: formValue.status === 'active',
            emailVerified: formValue.status === 'active',
        };
        if (!this.isEditing()) {
            dataToSave.createdAt = new Date().toISOString();
        }
        try {
            if (this.isEditing() && this.currentId) {
                await this.firebaseService.update('users', this.currentId, dataToSave);
                this.toastService.success('User updated successfully.');
            }
            else {
                await this.firebaseService.create('users', dataToSave);
                this.toastService.success('User created successfully.');
            }
            this.closeModal();
        }
        catch (e) {
            console.error(e);
            if (e.message?.includes('PERMISSION_DENIED') || e.code === 'PERMISSION_DENIED') {
                const msg = `PERMISSION DENIED: You must enable "write: true" in your Firebase Console rules.`;
                this.errorMessage.set(msg);
                this.toastService.error(msg);
            }
            else {
                const msg = `Failed to save user. ` + (e.message || 'Unknown error');
                this.errorMessage.set(msg);
                this.toastService.error(msg);
            }
        }
    }
    delete(id) {
        if (!this.authService.isAdmin()) {
            alert("Unauthorized: Only admins can delete users.");
            return;
        }
        this.itemToDelete.set(id);
        this.showConfirmModal.set(true);
    }
    closeConfirmModal() {
        this.showConfirmModal.set(false);
        this.itemToDelete.set(null);
    }
    async confirmDelete() {
        const id = this.itemToDelete();
        if (!this.authService.isAdmin() || !id) {
            this.closeConfirmModal();
            return;
        }
        try {
            await this.firebaseService.delete('users', id);
            this.toastService.success('User deleted successfully.');
        }
        catch (e) {
            if (e.message?.includes('PERMISSION_DENIED') || e.code === 'PERMISSION_DENIED') {
                this.toastService.error('Permission Denied: Cannot delete user.');
            }
            else {
                this.toastService.error('Failed to delete user: ' + (e.message || 'Unknown error'));
            }
        }
        finally {
            this.closeConfirmModal();
        }
    }
};
UsersComponent = __decorate([
    Component({
        selector: 'app-users',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent, PaginationControlsComponent],
        templateUrl: './users.component.html'
    })
], UsersComponent);
export { UsersComponent };
