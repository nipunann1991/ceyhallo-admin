var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { ToastService } from '../../../services/toast.service';
import { ModalComponent } from '../../ui/modal.component';
let BusinessCategoryModalComponent = class BusinessCategoryModalComponent {
    constructor() {
        this.category = input(null);
        this.maxOrder = input(0);
        this.close = output();
        this.saved = output();
        this.fb = inject(FormBuilder);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        this.isEditing = signal(false);
        this.isSaving = signal(false);
        this.form = this.fb.group({
            name: ['', Validators.required],
            order: [0]
        });
    }
    ngOnInit() {
        const c = this.category();
        if (c) {
            this.isEditing.set(true);
            this.form.patchValue(c);
        }
        else {
            this.form.patchValue({ order: this.maxOrder() + 1 });
        }
    }
    async save() {
        if (this.form.invalid)
            return;
        this.isSaving.set(true);
        const val = this.form.value;
        try {
            if (this.isEditing() && this.category()) {
                await this.firebaseService.update('taxonomy_business', this.category().id, val);
                this.toastService.success('Category updated');
            }
            else {
                await this.firebaseService.create('taxonomy_business', val);
                this.toastService.success('Category created');
            }
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
BusinessCategoryModalComponent = __decorate([
    Component({
        selector: 'app-business-category-modal',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, ModalComponent],
        template: `
    <app-modal [title]="isEditing() ? 'Edit Category' : 'Add New Category'" (close)="close.emit()">
      <div body>
        <form [formGroup]="form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
            <input formControlName="name" type="text" placeholder="e.g. Restaurants" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 border">
          </div>
        </form>
      </div>
      <div footer class="flex gap-3">
         <button (click)="save()" [disabled]="form.invalid || isSaving()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 min-w-[80px] flex justify-center">
            @if (isSaving()) { <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> }
            @else { {{ isEditing() ? 'Update' : 'Create' }} }
         </button>
         <button (click)="close.emit()" class="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
      </div>
    </app-modal>
  `
    })
], BusinessCategoryModalComponent);
export { BusinessCategoryModalComponent };
