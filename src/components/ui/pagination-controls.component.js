var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
let PaginationControlsComponent = class PaginationControlsComponent {
    constructor() {
        this.currentPage = input.required();
        this.totalItems = input.required();
        this.pageSize = input.required();
        this.pageChange = output();
        this.totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);
        this.startItem = computed(() => {
            if (this.totalItems() === 0)
                return 0;
            return (this.currentPage() - 1) * this.pageSize() + 1;
        });
        this.endItem = computed(() => {
            return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
        });
    }
    changePage(page) {
        if (page >= 1 && page <= this.totalPages()) {
            this.pageChange.emit(page);
        }
    }
};
PaginationControlsComponent = __decorate([
    Component({
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
            
            <span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>

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
], PaginationControlsComponent);
export { PaginationControlsComponent };
