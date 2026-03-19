import { Component, OnInit, signal, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import Quill from 'quill';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './legal.component.html'
})
export class LegalComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);

  docId = signal<string>('');
  title = signal<string>('');

  @ViewChild('editorContainer') editorContainer!: ElementRef;
  quill!: Quill;

  form: FormGroup;
  isSaving = signal(false);
  lastUpdated = signal<string | null>(null);
  updatedBy = signal<string | null>(null);
  showSource = signal(false);

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      content: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Get docId and title from route data
    const data = this.route.snapshot.data;
    if (data['docId']) {
      this.docId.set(data['docId']);
    }
    if (data['title']) {
      this.title.set(data['title']);
    }
    
    this.loadData();
  }

  ngAfterViewInit() {
    if (this.editorContainer) {
      this.quill = new Quill(this.editorContainer.nativeElement, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link', 'clean']
          ]
        }
      });

      const currentContent = this.form.get('content')?.value;
      if (currentContent) {
        this.quill.clipboard.dangerouslyPasteHTML(currentContent);
      }

      this.quill.on('text-change', () => {
        if (!this.showSource()) {
            const html = this.quill.root.innerHTML;
            this.form.patchValue({ content: html }, { emitEvent: false });
        }
      });
    }
  }

  toggleSource() {
    this.showSource.update(v => !v);
    
    if (this.showSource()) {
        const html = this.quill.root.innerHTML;
        this.form.patchValue({ content: html });
    } else {
        const html = this.form.get('content')?.value || '';
        if (this.quill) {
            this.quill.clipboard.dangerouslyPasteHTML(html);
        }
    }
  }

  async loadData() {
    try {
      const doc = await this.firebaseService.getDocument('legal', this.docId());
      
      if (doc) {
        const content = doc.content || '';
        this.form.patchValue({ content });
        this.lastUpdated.set(doc.updatedAt || null);
        this.updatedBy.set(doc.updatedBy || null);
        
        if (this.quill && !this.showSource()) {
           if (this.quill.root.innerHTML !== content) {
              this.quill.clipboard.dangerouslyPasteHTML(content);
           }
        }
      } else {
        this.form.patchValue({ content: '' });
        if (this.quill && !this.showSource()) this.quill.root.innerHTML = '';
      }
    } catch (e) {
      this.toastService.error(`Failed to load ${this.title()}`);
    }
  }

  async save() {
    if (!this.authService.isAdmin()) {
        this.toastService.error('Unauthorized: Admins only.');
        return;
    }
    
    this.isSaving.set(true);
    try {
        const data = {
            content: this.form.value.content,
            updatedAt: new Date().toISOString(),
            updatedBy: this.authService.currentUser()?.name
        };
        
        await this.firebaseService.set(`legal/${this.docId()}`, data);
        
        this.lastUpdated.set(data.updatedAt);
        this.updatedBy.set(data.updatedBy || null);
        this.toastService.success(`${this.title()} saved successfully.`);
    } catch (e: any) {
        if (e.code === 'permission-denied' || e.message?.includes('PERMISSION_DENIED')) {
            this.toastService.error(`Permission Denied.`);
        } else {
            this.toastService.error('Save failed: ' + e.message);
        }
    } finally {
        this.isSaving.set(false);
    }
  }
}