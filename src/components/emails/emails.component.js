var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
let EmailsComponent = class EmailsComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.templates = signal([]);
        this.searchQuery = signal('');
        // Pagination
        this.itemsPerPage = 10;
        this.currentPage = signal(1);
        this.filteredTemplates = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const sorted = this.templates().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            if (!query)
                return sorted;
            return sorted.filter((t) => t.name?.toLowerCase().includes(query) ||
                t.subject?.toLowerCase().includes(query));
        });
        this.paginatedTemplates = computed(() => {
            const data = this.filteredTemplates();
            const start = (this.currentPage() - 1) * this.itemsPerPage;
            return data.slice(start, start + this.itemsPerPage);
        });
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
    }
    ngOnInit() {
        this.firebaseService.listenToPath('email_templates', (data) => {
            this.templates.set(data);
        });
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
        this.currentPage.set(1);
    }
    delete(id) {
        if (!this.authService.isAdmin()) {
            this.toastService.error('Unauthorized');
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
        if (!id)
            return;
        try {
            await this.firebaseService.delete('email_templates', id);
            this.toastService.success('Template deleted.');
        }
        catch (e) {
            this.toastService.error('Failed to delete: ' + e.message);
        }
        finally {
            this.closeConfirmModal();
        }
    }
};
EmailsComponent = __decorate([
    Component({
        selector: 'app-emails',
        standalone: true,
        imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent],
        templateUrl: './emails.component.html',
    })
], EmailsComponent);
export { EmailsComponent };
