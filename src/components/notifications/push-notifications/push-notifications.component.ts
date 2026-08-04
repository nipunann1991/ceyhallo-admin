import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { PushNotification } from '../../../models/push-notification.model';
import { PushNotificationStatus, PushNotificationTargetType } from '../../../enums/notification.enums';
import { PaginationControlsComponent } from '../../ui/pagination-controls.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
import { ModalComponent } from '../../ui/modal.component';
import { SlidingPanelComponent } from '../../ui/sliding-panel.component';
import { ToastService } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-push-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationControlsComponent, ConfirmModalComponent, ModalComponent, SlidingPanelComponent],
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
  selectedNotification = signal<PushNotification | null>(null);
  notificationToDuplicate = signal<PushNotification | null>(null);
  notificationToDelete = signal<PushNotification | null>(null);
  duplicateTitle = signal('');
  duplicateBody = signal('');
  duplicateImageUrl = signal('');
  duplicateTargetType = signal<PushNotificationTargetType>(PushNotificationTargetType.Topic);
  duplicateTargetValue = signal('');
  duplicateDataJson = signal('');
  statusFilter = signal<'all' | PushNotificationStatus>('all');
  targetFilter = signal<PushNotificationTargetType>(PushNotificationTargetType.Topic);
  statusOptions: Array<{ label: string; value: 'all' | PushNotificationStatus }> = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: PushNotificationStatus.Pending },
    { label: 'Scheduled', value: PushNotificationStatus.Scheduled },
    { label: 'Sending', value: PushNotificationStatus.Sending },
    { label: 'Sent', value: PushNotificationStatus.Sent },
    { label: 'Failed', value: PushNotificationStatus.Failed }
  ];
  targetOptions: Array<{ label: string; value: PushNotificationTargetType }> = [
    { label: 'Topic', value: PushNotificationTargetType.Topic },
    { label: 'Single Device', value: PushNotificationTargetType.Token }
  ];
  
  notifications = signal<PushNotification[]>([]);
  private routeSub?: Subscription;

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  filteredNotifications = computed(() => {
    const status = this.statusFilter();
    const target = this.targetFilter();
    const data = this.notifications();
    return data.filter(note => {
      const matchesStatus = status === 'all' || note.status === status;
      const matchesTarget = note.targetType === target;
      return matchesStatus && matchesTarget;
    });
  });

  paginatedNotifications = computed(() => {
    const data = this.filteredNotifications();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  ngOnInit() {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const status = params.get('status') as 'all' | PushNotificationStatus | null;
      const target = params.get('target') as PushNotificationTargetType | null;
      const normalizedStatus = status && this.statusOptions.some(option => option.value === status) ? status : 'all';
      const normalizedTarget = target && this.targetOptions.some(option => option.value === target) ? target : PushNotificationTargetType.Topic;
      this.statusFilter.set(normalizedStatus);
      this.targetFilter.set(normalizedTarget);
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
    const normalizedValue = (this.statusOptions.some(option => option.value === value) ? value : 'all') as 'all' | PushNotificationStatus;
    this.statusFilter.set(normalizedValue);
    this.currentPage.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: normalizedValue === 'all' ? { status: null } : { status: normalizedValue },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onTargetFilterChange(value: PushNotificationTargetType) {
    const normalizedValue = (this.targetOptions.some(option => option.value === value) ? value : PushNotificationTargetType.Topic) as PushNotificationTargetType;
    this.targetFilter.set(normalizedValue);
    this.currentPage.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { target: normalizedValue },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  getRouteId(note: PushNotification) {
    const data = note.data || {};
    return data.routeId || data.routeID || data.route_id || '';
  }

  getDataJson(note: PushNotification | null) {
    if (!note?.data) return '-';
    return JSON.stringify(note.data, null, 2);
  }

  openViewNotification(note: PushNotification) {
    this.selectedNotification.set(note);
  }

  closeViewNotification() {
    this.selectedNotification.set(null);
  }

  openDuplicateConfirm(note: PushNotification) {
    this.notificationToDuplicate.set(note);
    this.duplicateTitle.set(note.title || '');
    this.duplicateBody.set(note.body || '');
    this.duplicateImageUrl.set(note.imageUrl || '');
    this.duplicateTargetType.set(note.targetType);
    this.duplicateTargetValue.set(note.targetValue || '');
    this.duplicateDataJson.set(note.data ? JSON.stringify(note.data, null, 2) : '');
    this.showDuplicateConfirm.set(true);
  }

  closeDuplicateConfirm() {
    this.showDuplicateConfirm.set(false);
    this.notificationToDuplicate.set(null);
    this.duplicateTitle.set('');
    this.duplicateBody.set('');
    this.duplicateImageUrl.set('');
    this.duplicateTargetType.set(PushNotificationTargetType.Topic);
    this.duplicateTargetValue.set('');
    this.duplicateDataJson.set('');
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

    const title = this.duplicateTitle().trim();
    const body = this.duplicateBody().trim();
    const imageUrl = this.duplicateImageUrl().trim();
    const targetType = this.duplicateTargetType();
    const targetValue = this.duplicateTargetValue().trim();

    if (!title || !body || !targetValue) {
      this.toastService.error('Title, body, and target value are required.');
      return;
    }

    let data: Record<string, unknown> | undefined;
    const dataJson = this.duplicateDataJson().trim();
    if (dataJson) {
      try {
        data = JSON.parse(dataJson);
      } catch {
        this.toastService.error('Custom data must be valid JSON.');
        return;
      }
    }

    this.actionInProgress.set(note.id);
    const payload = {
      title,
      body,
      imageUrl,
      targetType,
      targetValue,
      status: PushNotificationStatus.Pending,
      createdAt: new Date().toISOString(),
      ...(data ? { data } : {})
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
