import { Component, OnInit, signal, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { ToastService } from '../../services/toast.service';
import { HubSection } from '../../models/hub.model';
import { ModalComponent } from '../ui/modal.component';
import { TaxonomyItem } from '../../models/taxonomy.model';

@Component({
  selector: 'app-hub-section-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal [title]="isEditing() ? 'Edit Section' : 'Add New Section'" (close)="close.emit()">
      
      <!-- Header Action: Big Visibility Toggle -->
      <div header>
          <label class="flex items-center gap-3 cursor-pointer group" title="Show or hide this entire section">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                  {{ isActiveControl.value ? 'Visible' : 'Hidden' }}
              </span>
              <div class="relative inline-flex items-center">
                  <input type="checkbox" [formControl]="isActiveControl" class="sr-only peer">
                  <!-- Bigger Toggle: w-11 h-6 -->
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
          </label>
      </div>

      <div body>
        <form [formGroup]="form" class="space-y-5">
          
          <!-- Main Input (No Gray Box) -->
          <div class="space-y-2">
              <div class="flex justify-between items-center mb-1">
                  <label class="block text-sm font-medium text-slate-700">Section Title</label>
                  
                  <!-- Title Visibility (Kept inside form) -->
                  <label class="flex items-center gap-2 cursor-pointer group" title="Show or hide the title text in the app header">
                      <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
                          {{ isTitleVisibleControl.value ? 'Title: Shown' : 'Title: Hidden' }}
                      </span>
                      <div class="relative inline-flex items-center">
                          <input type="checkbox" [formControl]="isTitleVisibleControl" class="sr-only peer">
                          <!-- Standard Toggle: w-9 h-5 -->
                          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                  </label>
              </div>
              <input formControlName="title" type="text" placeholder="e.g. Government Services" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border font-medium text-lg">
          </div>

          <div class="grid grid-cols-2 gap-4">
             <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Layout Type</label>
                <select formControlName="type" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white">
                   <option value="service">List (Services)</option>
                   <option value="emergency">Grid (Emergency)</option>
                </select>
             </div>
             <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
                <input formControlName="order" type="number" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border">
             </div>
          </div>

          <div>
             <label class="block text-sm font-medium text-slate-700 mb-1">Country</label>
             <select formControlName="countryCode" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white">
                @for (c of countries(); track c.id) {
                   <option [value]="c.id">{{ c.name }}</option>
                }
             </select>
          </div>

          <!-- Content Filters -->
          <div class="border-t border-slate-200 pt-5 mt-5 space-y-4">
            <h4 class="font-bold text-slate-800">Content Filters</h4>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Data Source</label>
              <select formControlName="dataSource" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white">
                <option value="none">None</option>
                <option value="businesses">Businesses</option>
              </select>
            </div>

            @if (form.get('dataSource')?.value === 'businesses') {
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Filter by Business Category</label>
                <select formControlName="businessCategoryFilter" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white">
                  <option value="all">All Categories</option>
                  @for (cat of businessCategories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Filter by App Category</label>
                <select formControlName="appCategoryFilter" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white">
                  <option value="all">All Categories</option>
                  @for (cat of appCategories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.label }}</option>
                  }
                </select>
              </div>
            }
          </div>
        </form>
      </div>
      <div footer class="flex gap-3">
         <button (click)="save()" [disabled]="form.invalid || isSaving()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 min-w-[80px] flex justify-center items-center gap-2">
            @if (isSaving()) { <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> }
            @else { {{ isEditing() ? 'Update' : 'Create' }} }
         </button>
         <button (click)="close.emit()" class="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
      </div>
    </app-modal>
  `
})
export class HubSectionModalComponent implements OnInit {
  section = input<HubSection | null>(null);
  countries = input<any[]>([]);
  defaultCountry = input<string>('AE');
  close = output<void>();
  saved = output<void>();

  fb = inject(FormBuilder);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);

  form: FormGroup;
  isEditing = signal(false);
  isSaving = signal(false);
  businessCategories = signal<TaxonomyItem[]>([]);
  appCategories = signal<any[]>([]);

  constructor() {
    this.form = this.fb.group({
      title: ['', Validators.required],
      type: ['service', Validators.required],
      countryCode: ['', Validators.required],
      order: [1, Validators.required],
      isTitleVisible: [true],
      isActive: [true],
      dataSource: ['none'],
      businessCategoryFilter: ['all'],
      appCategoryFilter: ['all']
    });
  }

  // Helper getters to access controls easily in template
  get isActiveControl(): FormControl {
    return this.form.get('isActive') as FormControl;
  }

  get isTitleVisibleControl(): FormControl {
    return this.form.get('isTitleVisible') as FormControl;
  }

  ngOnInit() {
    const s = this.section();
    if (s) {
      this.isEditing.set(true);
      // Map legacy 'isVisible' to 'isTitleVisible' if needed
      const titleVis = s.isTitleVisible !== undefined ? s.isTitleVisible : (s as any).isVisible;
      
      this.form.patchValue({
        ...s,
        isTitleVisible: titleVis !== false,
        isActive: s.isActive !== false
      });
    } else {
      this.form.patchValue({ 
        countryCode: this.defaultCountry(), 
        isTitleVisible: true,
        isActive: true,
        dataSource: 'none',
        businessCategoryFilter: 'all',
        appCategoryFilter: 'all'
      });
    }

    this.firebaseService.listenToPath<TaxonomyItem>('taxonomy_business', (data) => {
      const filteredData = data.filter(item => item.name !== 'Popular' && item.name !== 'Featured');
      const sorted = filteredData.sort((a, b) => a.name.localeCompare(b.name));
      this.businessCategories.set(sorted);
    });

    this.firebaseService.listenToPath<any>('categories', (data) => {
      const filteredData = data.filter((cat: any) => cat.label !== 'Popular' && cat.label !== 'Featured');
      const sorted = filteredData.sort((a: any, b: any) => a.label.localeCompare(b.label));
      this.appCategories.set(sorted);
    });
  }

  async save() {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    const val = this.form.value;

    try {
      const dataToSave: HubSection = {
        ...val,
        businessCategoryFilter: val.dataSource === 'businesses' ? val.businessCategoryFilter : 'all',
        appCategoryFilter: val.dataSource === 'businesses' ? val.appCategoryFilter : 'all',
        items: [] // Ensure items are always initialized as an empty array
      };

      if (this.isEditing() && this.section()) {
        await this.firebaseService.update('hub_sections', this.section()!.id, dataToSave);
        this.toastService.success('Section updated');
      } else {
        await this.firebaseService.create('hub_sections', dataToSave);
        this.toastService.success('Section created');
      }
      this.saved.emit();
      this.close.emit();
    } catch (e: any) {
      this.toastService.error(e.message);
    } finally {
      this.isSaving.set(false);
    }
  }
}

