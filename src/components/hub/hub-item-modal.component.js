var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../ui/modal.component';
import { optimizeImage } from '../../utils/image-optimizer';
let HubItemModalComponent = class HubItemModalComponent {
    constructor() {
        this.item = input(null);
        this.sectionId = input.required();
        this.countryCode = input.required();
        this.close = output();
        this.saved = output();
        this.fb = inject(FormBuilder);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.isSaving = signal(false);
        this.isUploading = signal(false);
        this.form = this.fb.group({
            title: ['', Validators.required],
            subtitle: ['', Validators.required],
            iconUrl: ['', Validators.required],
            actionType: ['link', Validators.required],
            actionValue: ['', Validators.required],
            isActive: [true]
        });
    }
    ngOnInit() {
        if (this.item()) {
            this.form.patchValue(this.item());
        }
    }
    async onIconSelected(event) {
        const input = event.target;
        if (!input.files?.length)
            return;
        const rawFile = input.files[0];
        this.isUploading.set(true);
        try {
            const file = await optimizeImage(rawFile, 200, 0.9); // Small icon
            const path = `hub_icons/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
            const url = await this.firebaseService.uploadFile(path, file);
            this.form.patchValue({ iconUrl: url });
        }
        catch (e) {
            this.toastService.error('Icon upload failed');
        }
        finally {
            this.isUploading.set(false);
        }
    }
    async save() {
        if (this.form.invalid)
            return;
        this.isSaving.set(true);
        try {
            // 1. Fetch current section data to get the array
            const sectionDoc = await this.firebaseService.getDocument('hub_sections', this.sectionId());
            if (!sectionDoc)
                throw new Error('Section not found');
            const currentItems = sectionDoc.items || [];
            const val = this.form.value;
            // 2. Prepare Item Data
            const newItemData = {
                id: this.item()?.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                ...val,
                sectionId: this.sectionId(),
                countryCode: this.countryCode(),
                // Use existing order or append to end
                order: this.item()?.order ?? (currentItems.length + 1),
                displayStyle: this.item()?.displayStyle || 'list', // Default
                createdAt: this.item()?.createdAt || new Date().toISOString()
            };
            // 3. Update Array locally
            let updatedItems = [...currentItems];
            if (this.item()) {
                // Update existing item in array
                updatedItems = updatedItems.map(i => i.id === this.item().id ? { ...i, ...newItemData } : i);
            }
            else {
                // Append new item
                updatedItems.push(newItemData);
            }
            // 4. Save Section with new array
            await this.firebaseService.update('hub_sections', this.sectionId(), { items: updatedItems });
            this.toastService.success(this.item() ? 'Item updated' : 'Item added');
            this.saved.emit();
            this.close.emit();
        }
        catch (e) {
            this.toastService.error(e.message);
        }
        finally {
            this.isSaving.set(false);
        }
    }
};
HubItemModalComponent = __decorate([
    Component({
        selector: 'app-hub-item-modal',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, ModalComponent],
        template: `
    <app-modal [title]="item() ? 'Edit Item' : 'Add Item'" (close)="close.emit()">
      <div body>
        <form [formGroup]="form" class="space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input formControlName="title" type="text" placeholder="e.g. Police" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 border text-sm">
            </div>
            <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Subtitle / Hint</label>
                <input formControlName="subtitle" type="text" placeholder="e.g. Emergency 999" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 border text-sm">
            </div>
          </div>

          <!-- Icon -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Icon</label>
            <div class="flex items-center gap-3">
               <div class="w-16 h-16 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                  @if (form.get('iconUrl')?.value) {
                     <img [src]="form.get('iconUrl')?.value" class="w-full h-full object-cover">
                  } @else {
                     <svg class="w-6 h-6 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  }
                  @if (isUploading()) {
                     <div class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <span class="animate-spin w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full"></span>
                     </div>
                  }
               </div>
               <div class="flex-1">
                  <div class="flex gap-2">
                     <input formControlName="iconUrl" type="text" placeholder="https://..." class="flex-1 border-slate-300 rounded-lg p-2 text-sm border">
                     <label class="cursor-pointer bg-slate-100 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center">
                        Upload
                        <input type="file" (change)="onIconSelected($event)" accept="image/*" class="sr-only" [disabled]="isUploading()">
                     </label>
                  </div>
               </div>
            </div>
          </div>

          <!-- Action -->
          <div class="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
             <h4 class="text-xs font-bold text-slate-500 uppercase">Interaction</h4>
             <div class="grid grid-cols-3 gap-3">
                <div class="col-span-1">
                    <label class="block text-xs font-medium text-slate-500 mb-1">Type</label>
                    <select formControlName="actionType" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2 border bg-white text-sm">
                        <option value="link">Website</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="none">Info Only</option>
                    </select>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-medium text-slate-500 mb-1">Target Value</label>
                    <input formControlName="actionValue" type="text" 
                        [placeholder]="form.get('actionType')?.value === 'call' ? '+971...' : (form.get('actionType')?.value === 'email' ? 'help@...' : 'https://...')" 
                        class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2 border text-sm">
                </div>
             </div>
          </div>

          <!-- Settings -->
          <div class="flex items-center justify-between pt-2">
             <label class="block text-sm font-medium text-slate-700">Active Status</label>
             <label class="relative inline-flex items-center cursor-pointer">
               <input type="checkbox" formControlName="isActive" class="sr-only peer">
               <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
             </label>
          </div>
        </form>
      </div>
      <div footer class="flex gap-3">
         <button (click)="save()" [disabled]="form.invalid || isSaving() || isUploading()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 min-w-[80px] flex justify-center">
            @if (isSaving()) { <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> }
            @else { {{ item() ? 'Update' : 'Add' }} }
         </button>
         <button (click)="close.emit()" class="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
      </div>
    </app-modal>
  `
    })
], HubItemModalComponent);
export { HubItemModalComponent };
