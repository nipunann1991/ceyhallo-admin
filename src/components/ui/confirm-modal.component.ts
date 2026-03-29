import { CommonModule, NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, NgClass],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity backdrop-blur-sm" aria-hidden="true" (click)="cancel.emit()"></div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div class="bg-white px-4 pt-4 pb-3">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full"
                   [style.backgroundColor]="variant() === 'primary' ? '#dbeafe' : '#fee2e2'">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                     [style.color]="variant() === 'primary' ? '#083594' : '#dc2626'">
                  @if (variant() === 'primary') {
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 3.75H8A2.25 2.25 0 0 0 5.75 6v12A2.25 2.25 0 0 0 8 20.25h8A2.25 2.25 0 0 0 18.25 18V8.25L16 3.75Z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6M12 9v6"></path>
                  } @else {
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  }
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-medium text-slate-900" id="modal-title">{{ title() }}</h3>
                <p class="text-sm text-slate-500 mt-1">{{ message() }}</p>
              </div>
            </div>
          </div>
          <div class="bg-slate-50 px-4 py-3 flex justify-end gap-2">
            <button (click)="confirm.emit()" type="button"
              class="inline-flex justify-center rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-white"
              [style.backgroundColor]="variant() === 'primary' ? '#083594' : '#dc2626'"
              [style.borderColor]="variant() === 'primary' ? '#083594' : '#dc2626'">
              {{ confirmLabel() }}
            </button>
            <button (click)="cancel.emit()" type="button" class="inline-flex justify-center rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmModalComponent {
  title = input.required<string>();
  message = input.required<string>();
  confirmLabel = input('Delete');
  variant = input<'destructive' | 'primary'>('destructive');
  confirm = output<void>();
  cancel = output<void>();
}
