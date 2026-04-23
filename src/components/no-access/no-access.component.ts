import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[60vh] flex items-center justify-center px-6">
      <div class="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
        </div>
        <h1 class="mt-5 text-2xl font-bold text-slate-900">No Page Access Assigned</h1>
        <p class="mt-3 text-sm leading-6 text-slate-500">Your account does not currently have access to any dashboard pages. Contact an administrator to assign page permissions.</p>
        <div class="mt-6 flex justify-center">
          <button (click)="authService.logout()" class="rounded-lg bg-[#083594] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#062a71]">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  `
})
export class NoAccessComponent {
  authService = inject(AuthService);
}
