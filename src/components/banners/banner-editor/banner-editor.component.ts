
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { RichTextEditorComponent } from '../../ui/rich-text-editor.component';
import { optimizeImage } from '../../../utils/image-optimizer';

@Component({
  selector: 'app-banner-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './banner-editor.component.html'
})
export class BannerEditorComponent implements OnInit {
  form: FormGroup;
  isEditing = signal(false);
  isUploading = signal(false);
  currentId: string | null = null;

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      image: ['', Validators.required],
      description: [''],
      isActive: [true],
      isHomeBanner: [false],
      tag: [''],
      icon: [''],
      navigationType: ['none'],
      targetId: [''],
      publishedDate: [''],
      publishedBy: [''],
      content: ['']
    });

    // Listen to navigation type changes to control targetId validation/state
    this.form.get('navigationType')?.valueChanges.subscribe(type => {
      this.updateTargetIdState(type);
    });
  }

  ngOnInit() {
    this.initializeEditor();
  }

  private initializeEditor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.enableEditMode(id);
      return;
    }

    this.initializeNewBanner();
  }

  private enableEditMode(id: string) {
    this.isEditing.set(true);
    this.currentId = id;
    this.loadData(id);
  }

  private initializeNewBanner() {
    this.updateTargetIdState('none');
  }

  updateTargetIdState(type: string) {
    const targetControl = this.form.get('targetId');
    if (type === 'external' || type === 'internal') {
      targetControl?.setValidators([Validators.required]);
      targetControl?.enable();
    } else {
      targetControl?.clearValidators();
      targetControl?.disable();
      targetControl?.setValue('');
    }
    targetControl?.updateValueAndValidity();
  }

  async loadData(id: string) {
    try {
      const doc = await this.firebaseService.getDocument('banners', id);
      if (doc) {
        this.form.patchValue(doc);
        // Force update of validation state based on loaded type
        this.updateTargetIdState(doc.navigationType || 'none');
      }
    } catch (e) {
      this.toastService.error('Failed to load banner');
      this.router.navigate(['/banners']);
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const rawFile = input.files[0];
    this.isUploading.set(true);
    try {
      const file = await optimizeImage(rawFile);
      const path = `banners/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.form.patchValue({ image: url });
    } catch (e) {
      this.toastService.error('Upload failed');
    } finally {
      this.isUploading.set(false);
    }
  }

  async save() {
    if (!this.authService.canManageContent()) {
      this.toastService.error('Unauthorized');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dataToSave = this.form.getRawValue();

    // Auto-set order if new and not present
    if (!this.isEditing() && !dataToSave.order) {
        dataToSave.order = 9999; // Default to end of list, reorder tool handles fixes
    }

    try {
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('banners', this.currentId, dataToSave);
        this.toastService.success('Banner updated');
      } else {
        await this.firebaseService.create('banners', dataToSave);
        this.toastService.success('Banner created');
      }
      this.router.navigate(['/banners']);
    } catch (e: any) {
      this.toastService.error('Save failed: ' + e.message);
    }
  }
}
