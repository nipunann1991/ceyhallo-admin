
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { RichTextEditorComponent } from '../../ui/rich-text-editor.component';
import { Category } from '../../../models/category.model';
import { optimizeImage } from '../../../utils/image-optimizer';

@Component({
  selector: 'app-offer-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './offer-editor.component.html'
})
export class OfferEditorComponent implements OnInit {
  form: FormGroup;
  isEditing = signal(false);
  isUploading = signal(false);
  currentId: string | null = null;

  // Data Sources
  categories = signal<Category[]>([]);
  businesses = signal<any[]>([]);
  sortedBusinesses = computed(() => this.businesses().sort((a,b) => a.title.localeCompare(b.title)));

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
      generalCategory: ['Food', Validators.required],
      categories: [[], Validators.required], // Changed to empty array
      description: [''],
      content: [''],
      isActive: [true],
      
      // Display Options
      isHomeBanner: [false],
      isSectionBanner: [false],
      isFeatured: [false],
      isPremium: [false],
      
      // Link Config
      linkType: ['none', Validators.required],
      targetId: [''],
      offerBy: [''],
      
      // External link field (used if linkType is external)
      externalUrl: [''],
      
      tag: [''],
      publishedDate: [new Date().toISOString().slice(0, 10)],
      endDate: [''],
      publishedBy: ['']
    });

    // Handle Link Type Changes to manage Target ID validity
    this.form.get('linkType')?.valueChanges.subscribe(type => {
       this.updateFormStateForType(type);
    });
  }

  updateFormStateForType(type: string) {
     const targetControl = this.form.get('targetId');
     const urlControl = this.form.get('externalUrl');
     const offerByControl = this.form.get('offerBy');

     // Check for business tab key
     const isBusiness = type === 'businesses';
     
     const isExternal = type === 'external';

     if (isBusiness) {
        targetControl?.setValidators(Validators.required);
        targetControl?.enable();
        urlControl?.clearValidators();
        urlControl?.disable();
        offerByControl?.clearValidators();
        offerByControl?.disable();
     } else if (isExternal) {
        urlControl?.setValidators(Validators.required);
        urlControl?.enable();
        targetControl?.clearValidators();
        targetControl?.disable();
        offerByControl?.clearValidators();
        offerByControl?.disable();
     } else {
        // For 'none' or other category tabs that don't need a specific ID (just link to tab)
        targetControl?.clearValidators();
        targetControl?.disable();
        urlControl?.clearValidators();
        urlControl?.disable();
        offerByControl?.enable();
     }
     targetControl?.updateValueAndValidity();
     urlControl?.updateValueAndValidity();
     offerByControl?.updateValueAndValidity();
  }

  ngOnInit() {
    this.loadDropdownData();
    this.initializeEditor();
  }

  private loadDropdownData() {
    this.firebaseService.listenToPath<any>('taxonomy_business', (data) => {
      const filteredData = data.filter((cat: any) =>
        cat.name !== 'Popular' &&
        cat.name !== 'Featured' &&
        cat.name !== 'Food'
      );
      this.categories.set(filteredData.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    });

    this.firebaseService.listenToPath<any>('businesses', (data) => this.businesses.set(data));
  }

  private initializeEditor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.enableEditMode(id);
      return;
    }

    this.initializeNewOffer();
  }

  private enableEditMode(id: string) {
    this.isEditing.set(true);
    this.currentId = id;
    this.loadData(id);
  }

  private initializeNewOffer() {
    this.form.patchValue({ publishedBy: this.authService.currentUser()?.name || 'Admin' });
    this.updateFormStateForType('none');
  }

  async loadData(id: string) {
    try {
      const doc = await this.firebaseService.getDocument('offers', id);
      if (doc) {
        // Map targetId back to form if it's an external link
        let formData = { ...doc };
        if (doc.linkType === 'external') {
           formData.externalUrl = doc.targetId;
           formData.targetId = ''; 
        } else if (doc.linkType === 'none') {
           formData.offerBy = doc.offerBy || '';
        }
        
        // Ensure categories has a value if missing in old data
        if (!formData.categories) {
            // Fallback for old data that might have used 'category' string
            if (doc.category) {
                formData.categories = [doc.category];
            } else {
                formData.categories = [];
            }
        }

      // Fallback for generalCategory
      if (!formData.generalCategory) {
        formData.generalCategory = doc.category || 'Food';
      }

      if (formData.endDate === undefined || formData.endDate === null) {
        formData.endDate = '';
      }
        
        this.form.patchValue(formData);
        this.updateFormStateForType(doc.linkType);
      }
    } catch (e) {
      this.toastService.error('Failed to load offer');
      this.router.navigate(['/offers']);
    }
  }

  toggleCategory(name: string) {
    const current = this.form.get('categories')?.value || [];
    if (current.includes(name)) {
      this.form.patchValue({ categories: current.filter((c: string) => c !== name) });
    } else {
      this.form.patchValue({ categories: [...current, name] });
    }
  }

  onEntitySelect(event: Event) {
     // If a user selects a restaurant/business, maybe auto-fill title/image if empty?
     const select = event.target as HTMLSelectElement;
     const id = select.value;
     if (!id) return;

     const currentTitle = this.form.get('title')?.value;
     const currentImage = this.form.get('image')?.value;
     
     // Only auto-fill if empty to avoid overwriting edits
     if (!currentTitle || !currentImage) {
        const type = this.form.get('linkType')?.value;
        let found: any;
        
        const isBusiness = type === 'businesses';

        if (isBusiness) found = this.businesses().find(b => b.id === id);

        if (found) {
           if (!currentTitle) this.form.patchValue({ title: found.title });
           if (!currentImage) this.form.patchValue({ image: found.imageUrl });
        }
     }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const rawFile = input.files[0];
    this.isUploading.set(true);
    try {
      const file = await optimizeImage(rawFile);
      const path = `offers/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
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

    const raw = this.form.getRawValue();
    const linkType = raw.linkType;
    
    // Normalize targetId
    let finalTargetId = raw.targetId;
    let finalTargetName = '';
    let finalOfferBy = raw.offerBy || '';

    const isBusiness = linkType === 'businesses';

    if (linkType === 'external') {
       finalTargetId = raw.externalUrl;
       finalTargetName = 'External Link';
    } else if (isBusiness) {
       const b = this.businesses().find(i => i.id === raw.targetId);
       finalTargetName = b ? b.title : 'Unknown Business';
    } else {
       // For 'none'
       finalTargetName = 'No Link';
       finalTargetId = ''; 
    }

    const dataToSave = {
      title: raw.title,
      image: raw.image,
      generalCategory: raw.generalCategory,
      categories: raw.isSectionBanner ? (raw.categories || []).filter((c: string) => c !== 'Food') : [],
      description: raw.description,
      content: raw.content,
      isActive: raw.isActive,
      
      // Display Flags
      isHomeBanner: raw.isHomeBanner,
      isSectionBanner: raw.isSectionBanner,

      linkType: linkType,
      targetId: finalTargetId,
      targetName: finalTargetName,
      offerBy: linkType === 'none' ? finalOfferBy : '',
      tag: raw.tag,
      publishedDate: raw.publishedDate,
      endDate: raw.endDate || '',
      publishedBy: raw.publishedBy
    };

    // Auto-order if new
    if (!this.isEditing()) {
       (dataToSave as any).order = 9999;
    }

    try {
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('offers', this.currentId, dataToSave);
        this.toastService.success('Offer updated');
      } else {
        await this.firebaseService.create('offers', dataToSave);
        this.toastService.success('Offer created');
      }
      this.router.navigate(['/offers']);
    } catch (e: any) {
      this.toastService.error('Save failed: ' + e.message);
    }
  }
}
