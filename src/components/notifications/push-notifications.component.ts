import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { PushNotification } from '../../models/push-notification.model';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-push-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationControlsComponent, ConfirmModalComponent],
  templateUrl: './push-notifications.component.html'
})
export class PushNotificationsComponent implements OnInit, OnDestroy {
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  actionInProgress = signal<string | null>(null);
  showDuplicateConfirm = signal(false);
  showDeleteConfirm = signal(false);
  notificationToDuplicate = signal<PushNotification | null>(null);
  notificationToDelete = signal<PushNotification | null>(null);
  statusFilter = signal<'all' | PushNotification['status']>('all');
  statusOptions: Array<{ label: string; value: 'all' | PushNotification['status'] }> = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Sending', value: 'sending' },
    { label: 'Sent', value: 'sent' },
    { label: 'Failed', value: 'failed' }
  ];
  
  notifications = signal<PushNotification[]>([]);
  private routeSub?: Subscription;

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  filteredNotifications = computed(() => {
    const status = this.statusFilter();
    const data = this.notifications();
    return status === 'all' ? data : data.filter(note => note.status === status);
  });

  paginatedNotifications = computed(() => {
    const data = this.filteredNotifications();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  ngOnInit() {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const status = params.get('status') as 'all' | PushNotification['status'] | null;
      const normalizedStatus = status && this.statusOptions.some(option => option.value === status) ? status : 'all';
      this.statusFilter.set(normalizedStatus);
      this.currentPage.set(1);
    });

    this.firebaseService.listenToPath<PushNotification>('push_queue', (data) => {
      // Sort by newest first
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.notifications.set(sorted);
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  onStatusFilterChange(value: string) {
    const normalizedValue = (this.statusOptions.some(option => option.value === value) ? value : 'all') as 'all' | PushNotification['status'];
    this.statusFilter.set(normalizedValue);
    this.currentPage.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: normalizedValue === 'all' ? { status: null } : { status: normalizedValue },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  openDuplicateConfirm(note: PushNotification) {
    this.notificationToDuplicate.set(note);
    this.showDuplicateConfirm.set(true);
  }

  closeDuplicateConfirm() {
    this.showDuplicateConfirm.set(false);
    this.notificationToDuplicate.set(null);
  }

  openDeleteConfirm(note: PushNotification) {
    this.notificationToDelete.set(note);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
    this.notificationToDelete.set(null);
  }

  async confirmDuplicate() {
    const note = this.notificationToDuplicate();
    if (!note || this.actionInProgress()) return;

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
    } catch (error: any) {
      console.error('Failed to duplicate notification', error);
      this.toastService.error('Unable to duplicate notification.');
    } finally {
      this.actionInProgress.set(null);
      this.closeDuplicateConfirm();
    }
  }

  async confirmDelete() {
    const note = this.notificationToDelete();
    if (!note || this.actionInProgress()) return;

    this.actionInProgress.set(note.id);
    try {
      await this.firebaseService.delete('push_queue', note.id);
      this.toastService.success('Notification removed from queue.');
    } catch (error: any) {
      console.error('Failed to delete notification', error);
      this.toastService.error('Unable to delete notification.');
    } finally {
      this.actionInProgress.set(null);
      this.closeDeleteConfirm();
    }
  }
}
