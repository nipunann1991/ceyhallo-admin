
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { RichTextEditorComponent } from '../../ui/rich-text-editor.component';
import { optimizeImage } from '../../../utils/image-optimizer';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './event-editor.component.html'
})
export class EventEditorComponent implements OnInit {
  form: FormGroup;
  isEditing = signal(false);
  isUploading = signal(false);
  isGalleryUploading = signal(false);
  showUrlInput = signal(false);
  currentId: string | null = null;
  
  // Data for Dropdowns
  locations = signal<any[]>([]);
  availableCities = signal<{code: string, name: string}[]>([]);
  
  // Organizer Entities
  businesses = signal<any[]>([]);

  // Computed lists sorted alphabetically
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
      description: ['', Validators.required],
      fullDate: ['', Validators.required],
      startTime: [''],
      endTime: [''],
      allDayEvent: [false],
      location: ['', Validators.required],
      imageUrl: [''],
      
      // Organizer Logic
      organizer: ['', Validators.required], // Name string
      organizerId: ['', Validators.required],
      organizerType: ['business'],

      category: ['', Validators.required],
      isFeatured: [false],
      eventBannerOrder: [null],
      countryCode: ['AE', Validators.required],
      cityCode: ['DXB', Validators.required],
      publishedDate: [new Date().toISOString().slice(0, 10), Validators.required],
      isPublished: [true],
      isExpired: [false],
      isArchived: [false],
      
      // Action
      actionType: ['none'],
      actionTarget: [''],

      gallery: this.fb.array([])
    });

    this.form.get('isExpired')?.valueChanges.subscribe(expired => {
      if (expired) {
        this.form.patchValue({ isPublished: false }, { emitEvent: false });
      }
    });

    this.form.get('isArchived')?.valueChanges.subscribe(archived => {
      if (archived) {
        this.form.patchValue({ isPublished: false }, { emitEvent: false });
      }
    });

    this.form.get('isPublished')?.valueChanges.subscribe(published => {
      if (published) {
        if (this.form.get('isExpired')?.value || this.form.get('isArchived')?.value) {
          this.form.patchValue({ isPublished: false }, { emitEvent: false });
        }
      }
    });
  }

  get galleryArray() { return this.form.get('gallery') as FormArray; }

  ngOnInit() {
    this.loadDropdownData();
    this.initializeEditor();
  }

  private initializeEditor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.enableEditMode(id);
    }
  }

  private enableEditMode(id: string) {
    this.isEditing.set(true);
    this.currentId = id;
    this.loadData(id);
  }

  loadDropdownData() {
    // Locations
    this.firebaseService.listenToPath<any>('countries', (data) => {
      const mappedLocations = data.map(country => {
        let citiesArray: {code: string, name: string}[] = [];
        if (country.cities) {
          if (Array.isArray(country.cities)) {
             citiesArray = country.cities;
          } else {
             citiesArray = Object.keys(country.cities).map(key => ({
               code: key,
               name: country.cities[key].name || country.cities[key] 
             }));
          }
        }
        return { code: country.id, name: country.name, cities: citiesArray };
      });
      this.locations.set(mappedLocations);
      this.updateCitiesForCountry('AE');
    });

    // Entities
    this.firebaseService.listenToPath<any>('businesses', (data) => this.businesses.set(data));
  }

  onEntitySelect(event: Event) {
      const select = event.target as HTMLSelectElement;
      const id = select.value;
      
      let found: any = this.businesses().find(x => x.id === id);

      if (found) {
          this.form.patchValue({
              organizer: found.title, // Store snapshot name
              organizerId: found.id
          });
      }
  }

  async loadData(id: string) {
    try {
      const doc = await this.firebaseService.getDocument('events', id);
      if (doc) {
        if (doc.countryCode) this.updateCitiesForCountry(doc.countryCode);
        
        // Handle legacy data where organizerType might be missing
        const safeType = doc.organizerType || 'business';

        let formattedFullDate = doc.fullDate;
        if (formattedFullDate) {
            const d = new Date(formattedFullDate);
            if (!isNaN(d.getTime())) {
                formattedFullDate = d.toISOString().substring(0, 10);
            }
        }

        this.form.patchValue({
            ...doc,
            fullDate: formattedFullDate,
            organizerType: safeType,
            publishedDate: doc.publishedDate ? doc.publishedDate.substring(0, 10) : '',
            actionType: doc.actionType || 'none',
            actionTarget: doc.actionTarget || ''
        });

        this.galleryArray.clear();
        if (doc.gallery && Array.isArray(doc.gallery)) {
          doc.gallery.forEach((url: string) => this.addGalleryItem(url));
        }
      }
    } catch (e) {
      this.toastService.error('Failed to load event');
      this.router.navigate(['/events']);
    }
  }

  onCountryChange() {
    const code = this.form.get('countryCode')?.value;
    this.updateCitiesForCountry(code);
    const cities = this.availableCities();
    if (cities.length > 0) this.form.patchValue({ cityCode: cities[0].code });
    else this.form.patchValue({ cityCode: '' });
  }

  updateCitiesForCountry(countryCode: string) {
    const country = this.locations().find(c => c.code === countryCode);
    this.availableCities.set(country ? country.cities : []);
  }

  addGalleryItem(url: string) {
    this.galleryArray.push(this.fb.control(url, Validators.required));
  }

  removeGalleryItem(index: number) {
    this.galleryArray.removeAt(index);
  }

  toggleUrlInput() {
    this.showUrlInput.update(v => !v);
  }

  addGalleryUrl(url: string) {
    if (url && url.trim()) {
      this.addGalleryItem(url.trim());
      this.showUrlInput.set(false);
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const rawFile = input.files[0];
    this.isUploading.set(true);
    try {
      const file = await optimizeImage(rawFile);
      const path = `events/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.form.patchValue({ imageUrl: url });
    } catch (e) {
      this.toastService.error('Upload failed');
    } finally {
      this.isUploading.set(false);
    }
  }

  async onGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const rawFile = input.files[0];
    this.isGalleryUploading.set(true);
    try {
      const file = await optimizeImage(rawFile);
      const path = `events/gallery/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.addGalleryItem(url);
    } catch (e) {
      this.toastService.error('Gallery upload failed');
    } finally {
      this.isGalleryUploading.set(false);
      input.value = '';
    }
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Fill required fields');
      return;
    }

    const raw = this.form.getRawValue();
    const dataToSave: any = { 
        ...raw,
        gallery: raw.gallery,
        // Ensure strings if null
        organizerId: raw.organizerId || '',
        organizerType: 'business',
    };

    dataToSave.publishedDate = new Date(raw.publishedDate).toISOString();

    if (!this.isEditing()) {
        dataToSave.createdDate = new Date().toISOString();
    }

    try {
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('events', this.currentId, dataToSave);
        this.toastService.success('Event updated');
      } else {
        await this.firebaseService.create('events', dataToSave);
        this.toastService.success('Event created');
      }
      this.router.navigate(['/events']);
    } catch (e: any) {
      this.toastService.error('Save failed: ' + e.message);
    }
  }
}
