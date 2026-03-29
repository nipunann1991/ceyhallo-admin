var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
let SlidingPanelComponent = class SlidingPanelComponent {
    constructor() {
        this.isOpen = input.required();
        this.title = input('Details');
        this.close = output();
    }
};
SlidingPanelComponent = __decorate([
    Component({
        selector: 'app-sliding-panel',
        standalone: true,
        imports: [CommonModule],
        template: `
    <div class="fixed inset-0 z-[70] overflow-hidden" 
         [class.pointer-events-none]="!isOpen()" 
         role="dialog" 
         aria-modal="true">
      
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out cursor-pointer"
        style="opacity: 0"
        [style.opacity]="isOpen() ? '1' : '0'"
        (click)="close.emit()">
      </div>

      <!-- Panel Container -->
      <div class="absolute inset-y-0 right-0 max-w-full flex pointer-events-none">
        <!-- Panel Content -->
        <div 
          class="pointer-events-auto w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out"
          style="transform: translateX(100%)"
          [style.transform]="isOpen() ? 'translateX(0)' : 'translateX(100%)'">
             
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <h2 class="text-lg font-bold text-slate-800">{{ title() }}</h2>
            <button (click)="close.emit()" class="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 relative">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    </div>
  `
    })
], SlidingPanelComponent);
export { SlidingPanelComponent };
