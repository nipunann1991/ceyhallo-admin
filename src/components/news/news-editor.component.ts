
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { RichTextEditorComponent } from '../ui/rich-text-editor.component';
import { optimizeImage } from '../../utils/image-optimizer';

@Component({
  selector: 'app-news-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './news-editor.component.html'
})
export class NewsEditorComponent implements OnInit {
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
      excerpt: ['', Validators.required],
      content: ['', Validators.required],
      imageUrl: [''],
      publishedDate: [new Date().toISOString().slice(0, 16), Validators.required],
      author: ['', Validators.required],
      category: ['', Validators.required],
      isFeatured: [false],
      isPublished: [true],
      isNewsPageBanner: [false]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.currentId = id;
      this.loadData(id);
    } else {
        this.form.patchValue({
            author: this.authService.currentUser()?.name || 'Admin'
        });
    }
  }

  async loadData(id: string) {
    try {
      const doc = await this.firebaseService.getDocument('news', id);
      if (doc) {
        this.form.patchValue(doc);
      }
    } catch (e) {
      this.toastService.error('Failed to load news');
      this.router.navigate(['/news']);
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const rawFile = input.files[0];
    this.isUploading.set(true);
    try {
      const file = await optimizeImage(rawFile);
      const path = `news/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.form.patchValue({ imageUrl: url });
    } catch (e) {
      this.toastService.error('Upload failed');
    } finally {
      this.isUploading.set(false);
    }
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dataToSave = this.form.getRawValue();

    if (!this.isEditing()) {
       dataToSave.createdDate = new Date().toISOString();
    }

    try {
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('news', this.currentId, dataToSave);
        this.toastService.success('News updated');
      } else {
        await this.firebaseService.create('news', dataToSave);
        this.toastService.success('News created');
      }
      this.router.navigate(['/news']);
    } catch (e: any) {
      this.toastService.error('Save failed: ' + e.message);
    }
  }
}
