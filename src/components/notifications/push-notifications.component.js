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
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { ToastService } from '../../services/toast.service';
let PushNotificationsComponent = class PushNotificationsComponent {
    constructor() {
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.actionInProgress = signal(null);
        this.showDuplicateConfirm = signal(false);
        this.showDeleteConfirm = signal(false);
        this.notificationToDuplicate = signal(null);
        this.notificationToDelete = signal(null);
        this.notifications = signal([]);
        // Pagination
        this.itemsPerPage = 10;
        this.currentPage = signal(1);
        this.paginatedNotifications = computed(() => {
            const data = this.notifications(); // No filter applied in this component yet
            const start = (this.currentPage() - 1) * this.itemsPerPage;
            return data.slice(start, start + this.itemsPerPage);
        });
    }
    ngOnInit() {
        this.firebaseService.listenToPath('push_queue', (data) => {
            // Sort by newest first
            const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.notifications.set(sorted);
        });
    }
    openDuplicateConfirm(note) {
        this.notificationToDuplicate.set(note);
        this.showDuplicateConfirm.set(true);
    }
    closeDuplicateConfirm() {
        this.showDuplicateConfirm.set(false);
        this.notificationToDuplicate.set(null);
    }
    openDeleteConfirm(note) {
        this.notificationToDelete.set(note);
        this.showDeleteConfirm.set(true);
    }
    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.notificationToDelete.set(null);
    }
    async confirmDuplicate() {
        const note = this.notificationToDuplicate();
        if (!note || this.actionInProgress())
            return;
        this.actionInProgress.set(note.id);
        const payload = {
            title: note.title,
            body: note.body,
            imageUrl: note.imageUrl,
            targetType: note.targetType,
            targetValue: note.targetValue,
            status: 'pending',
            createdAt: new Date().toISOString(),
            data: note.data
        };
        try {
            await this.firebaseService.create('push_queue', payload);
            this.toastService.success('Notification duplicated successfully.');
        }
        catch (error) {
            console.error('Failed to duplicate notification', error);
            this.toastService.error('Unable to duplicate notification.');
        }
        finally {
            this.actionInProgress.set(null);
            this.closeDuplicateConfirm();
        }
    }
    async confirmDelete() {
        const note = this.notificationToDelete();
        if (!note || this.actionInProgress())
            return;
        this.actionInProgress.set(note.id);
        try {
            await this.firebaseService.delete('push_queue', note.id);
            this.toastService.success('Notification removed from queue.');
        }
        catch (error) {
            console.error('Failed to delete notification', error);
            this.toastService.error('Unable to delete notification.');
        }
        finally {
            this.actionInProgress.set(null);
            this.closeDeleteConfirm();
        }
    }
};
PushNotificationsComponent = __decorate([
    Component({
        selector: 'app-push-notifications',
        standalone: true,
        imports: [CommonModule, RouterLink, PaginationControlsComponent, ConfirmModalComponent],
        templateUrl: './push-notifications.component.html'
    })
], PushNotificationsComponent);
export { PushNotificationsComponent };
