import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { EmailQueueItem, EmailTemplate } from '../../models/email-template.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { TableSortController } from '../ui/table-sort.controller';

@Component({
  selector: 'app-emails',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent],
  templateUrl: './emails.component.html',
})
export class EmailsComponent extends TableSortController implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);

  templates = signal<EmailTemplate[]>([]);
  queueItems = signal<EmailQueueItem[]>([]);
  searchQuery = signal('');
  activeTab = signal<'templates' | 'queue'>('templates');

  // Pagination
  itemsPerPage = signal(10);
  queueItemsPerPage = signal(10);
  currentPage = signal(1);
  queueCurrentPage = signal(1);

  filteredTemplates = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const sorted = this.templates().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const rows = !query ? sorted : sorted.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        t.subject?.toLowerCase().includes(query)
    );
    return this.sortTableRows(rows, (template, column) => ({
      name: template.name,
      subject: template.subject,
      updated: template.updatedAt
    })[column]);
  });

  paginatedTemplates = computed(() => {
    const data = this.filteredTemplates();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  completedQueueItems = computed(() => {
    const rows = this.queueItems()
      .filter((item) => item.status === 'sent' || item.status === 'failed')
      .sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt));
    return this.sortTableRows(rows, (item, column) => ({
      recipient: this.getQueueRecipient(item),
      template: this.getQueueTemplate(item),
      status: item.status,
      created: item.createdAt,
      completed: this.getQueueDate(item),
      error: item.error
    })[column]);
  });

  paginatedQueueItems = computed(() => {
    const data = this.completedQueueItems();
    const start = (this.queueCurrentPage() - 1) * this.queueItemsPerPage();
    return data.slice(start, start + this.queueItemsPerPage());
  });

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  ngOnInit() {
    this.firebaseService.listenToPath<EmailTemplate>(
      'email_templates',
      (data) => {
        this.templates.set(data);
      }
    );

    this.firebaseService.listenToPath<EmailQueueItem>('email_queue', (data) => {
      this.queueItems.set(data);
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  delete(id: string) {
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
    if (!id) return;
    try {
      await this.firebaseService.delete('email_templates', id);
      this.toastService.success('Template deleted.');
    } catch (e: any) {
      this.toastService.error('Failed to delete: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }

  getQueueRecipient(item: EmailQueueItem) {
    return item.to || item.email || item.target?.testEmail || 'All users';
  }

  getQueueTemplate(item: EmailQueueItem) {
    return item.target?.template || item.subject || item.templateId || 'Email';
  }

  getQueueDate(item: EmailQueueItem) {
    return item.status === 'failed'
      ? this.toDate(item.failedAt || item.createdAt)
      : this.toDate(item.sentAt || item.createdAt);
  }

  private toDate(value?: EmailQueueItem['sentAt'] | string) {
    const millis = this.toMillis(value);
    return millis ? new Date(millis) : null;
  }

  private toMillis(value?: EmailQueueItem['sentAt'] | string) {
    if (!value) return 0;
    if (typeof value === 'string') return Date.parse(value) || 0;
    return (value._seconds || 0) * 1000 + Math.floor((value._nanoseconds || 0) / 1000000);
  }
}
