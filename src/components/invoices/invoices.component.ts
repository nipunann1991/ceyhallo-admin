import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Invoice } from '../../models/invoice.model';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { TableSortController } from '../ui/table-sort.controller';
import { SlidingPanelComponent } from '../ui/sliding-panel.component';
import { InvoicePreviewComponent } from './invoice-preview/invoice-preview.component';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationControlsComponent, SlidingPanelComponent, InvoicePreviewComponent],
  templateUrl: './invoices.component.html'
})
export class InvoicesComponent extends TableSortController implements OnInit {
  readonly authService = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly toastService = inject(ToastService);

  readonly invoices = signal<Invoice[]>([]);
  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(10);
  readonly showConfirmModal = signal(false);
  readonly itemToDelete = signal<string | null>(null);
  readonly selectedInvoice = signal<Invoice | null>(null);

  readonly filteredInvoices = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const rows = [...this.invoices()]
      .filter(invoice => !query || [invoice.invoiceNumber, invoice.customerName, invoice.customerEmail, invoice.status]
        .some(value => value?.toLowerCase().includes(query)))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return this.sortTableRows(rows, (invoice, column) => ({
      number: invoice.invoiceNumber,
      customer: `${invoice.customerName} ${invoice.customerEmail}`,
      issued: invoice.issueDate,
      due: invoice.dueDate,
      total: invoice.total,
      status: invoice.status
    })[column]);
  });

  readonly paginatedInvoices = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredInvoices().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.firebaseService.listenToPath<Invoice>('invoices', data => this.invoices.set(data));
  }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  preview(invoice: Invoice): void { this.selectedInvoice.set(invoice); }
  closePreview(): void { this.selectedInvoice.set(null); }

  requestDelete(id: string): void {
    if (!this.authService.isAdmin()) return;
    this.itemToDelete.set(id);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.itemToDelete.set(null);
    this.showConfirmModal.set(false);
  }

  async confirmDelete(): Promise<void> {
    const id = this.itemToDelete();
    if (!id || !this.authService.isAdmin()) return;
    try {
      await this.firebaseService.delete('invoices', id);
      this.toastService.success('Invoice deleted.');
    } catch (error: any) {
      this.toastService.error('Delete failed: ' + error.message);
    } finally {
      this.closeConfirmModal();
    }
  }
}
