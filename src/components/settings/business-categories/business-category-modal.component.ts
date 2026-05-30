import { Component, OnInit, signal, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { ToastService } from '../../../services/toast.service';
import { TaxonomyItem } from '../../../models/taxonomy.model';
import { ModalComponent } from '../../ui/modal.component';

@Component({
  selector: 'app-business-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './business-category-modal.component.html'
})
export class BusinessCategoryModalComponent implements OnInit {
  category = input<TaxonomyItem | null>(null);
  maxOrder = input(0);
  close = output<void>();
  saved = output<void>();

  fb = inject(FormBuilder);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);

  form: FormGroup;
  isEditing = signal(false);
  isSaving = signal(false);

  constructor() {
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
    } else {
      this.form.patchValue({ order: this.maxOrder() + 1 });
    }
  }

  async save() {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    const val = this.form.value;

    try {
      if (this.isEditing() && this.category()) {
        await this.firebaseService.update('taxonomy_business', this.category()!.id, val);
        this.toastService.success('Category updated');
      } else {
        await this.firebaseService.create('taxonomy_business', val);
        this.toastService.success('Category created');
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
