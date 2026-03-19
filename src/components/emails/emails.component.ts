import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { EmailTemplate } from '../../models/email-template.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';

@Component({
  selector: 'app-emails',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent],
  templateUrl: './emails.component.html',
})
export class EmailsComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);

  templates = signal<EmailTemplate[]>([]);
  searchQuery = signal('');

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  filteredTemplates = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const sorted = this.templates().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (!query) return sorted;

    return sorted.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        t.subject?.toLowerCase().includes(query)
    );
  });

  paginatedTemplates = computed(() => {
    const data = this.filteredTemplates();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
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
}