import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl">
      <div class="flex flex-1 justify-between sm:hidden">
        <button 
          [disabled]="currentPage() === 1"
          (click)="changePage(currentPage() - 1)" 
          class="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Previous
        </button>
        <button 
          [disabled]="currentPage() === totalPages()"
          (click)="changePage(currentPage() + 1)"
          class="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Next
        </button>
      </div>
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-slate-700">
            Showing
            <span class="font-medium">{{ startItem() }}</span>
            to
            <span class="font-medium">{{ endItem() }}</span>
            of
            <span class="font-medium">{{ totalItems() }}</span>
            results
          </p>
        </div>
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button 
              (click)="changePage(currentPage() - 1)"
              [disabled]="currentPage() === 1"
              class="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">Previous</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>

            @if (showPageGrid()) {
              <div class="flex max-w-[420px] flex-wrap gap-1 bg-white px-2 py-1 ring-1 ring-inset ring-slate-300">
                @for (page of pageNumbers(); track $index) {
                  @if (page === '...') {
                    <span class="min-w-8 px-2 py-1 text-center text-sm font-semibold text-slate-400">...</span>
                  } @else {
                    <button
                      type="button"
                      (click)="changePage(page)"
                      [class.bg-[#083594]]="page === currentPage()"
                      [class.text-white]="page === currentPage()"
                      [class.text-slate-700]="page !== currentPage()"
                      class="min-w-8 rounded px-2 py-1 text-sm font-semibold transition-colors hover:bg-[#083594]/10">
                      {{ page }}
                    </button>
                  }
                }
              </div>
            } @else {
              <span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
                Page {{ currentPage() }} of {{ totalPages() }}
              </span>
            }

            <button 
              (click)="changePage(currentPage() + 1)"
              [disabled]="currentPage() === totalPages()"
              class="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">Next</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  `
})
export class PaginationControlsComponent {
  currentPage = input.required<number>();
  totalItems = input.required<number>();
  pageSize = input.required<number>();
  showPageGrid = input(false);
  pageChange = output<number>();

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);
  pageNumbers = computed<Array<number | '...'>>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

    const pages = new Set<number>([1, total, current - 1, current, current + 1]);
    if (current <= 4) {
      [2, 3, 4, 5].forEach((page) => pages.add(page));
    }
    if (current >= total - 3) {
      [total - 4, total - 3, total - 2, total - 1].forEach((page) => pages.add(page));
    }

    const sorted = Array.from(pages)
      .filter((page) => page >= 1 && page <= total)
      .sort((a, b) => a - b);

    const result: Array<number | '...'> = [];
    sorted.forEach((page, index) => {
      const previous = sorted[index - 1];
      if (previous && page - previous > 1) result.push('...');
      result.push(page);
    });

    return result;
  });
  
  startItem = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endItem = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageChange.emit(page);
    }
  }
}
