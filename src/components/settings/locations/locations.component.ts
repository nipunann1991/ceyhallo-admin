import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Country, City } from '../../../models/location.model';
import { ModalComponent } from '../../ui/modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: './locations.component.html'
})
export class LocationsComponent implements OnInit {
  countries = signal<Country[]>([]);
  searchQuery = signal('');

  filteredCountries = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.countries().filter(c => 
      c.name?.toLowerCase().includes(query) || 
      c.code?.toLowerCase().includes(query)
    );
  });

  showModal = signal(false);
  isEditing = signal(false);
  currentCode: string | null = null;
  errorMessage = signal<string | null>(null);
  form: FormGroup;
  
  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  constructor(
    public authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Z]{2,3}$/)]],
      name: ['', Validators.required],
      flagUrl: [''],
      isActive: [true],
      cities: this.fb.array([])
    });
  }

  get citiesFormArray() {
    return this.form.get('cities') as FormArray;
  }

  createCityGroup(city: Partial<City> = {}) {
    return this.fb.group({
      code: [city.code || '', [Validators.required, Validators.pattern(/^[A-Z0-9]+$/)]],
      name: [city.name || '', Validators.required],
      isActive: [city.isActive !== false] // Default to true if undefined
    });
  }

  addCity() {
    this.citiesFormArray.push(this.createCityGroup());
  }

  removeCity(index: number) {
    this.citiesFormArray.removeAt(index);
  }

  ngOnInit() {
    this.firebaseService.listenToPath<any>('countries', (data) => {
      const mapped = data.map(country => {
        let citiesArray: City[] = [];
        if (country.cities) {
          if (Array.isArray(country.cities)) {
            citiesArray = country.cities.map((city: any) => ({
                code: city.code,
                name: city.name,
                isActive: city.isActive !== false
            })).filter((city: City) => city && city.code && city.name);
          } else if (typeof country.cities === 'object') {
            citiesArray = Object.keys(country.cities).map(key => ({
              code: key,
              name: typeof country.cities[key] === 'object' ? country.cities[key].name : country.cities[key],
              isActive: true // legacy fallback
            }));
          }
        }
        return {
          code: country.id,
          name: country.name,
          flagUrl: country.flagUrl,
          isActive: country.isActive !== false,
          cities: citiesArray
        };
      });
      this.countries.set(mapped as Country[]);
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  openModal() {
    if (!this.authService.isAdmin()) {
      alert("Unauthorized: Only admins can manage locations.");
      return;
    }
    this.isEditing.set(false);
    this.currentCode = null;
    this.errorMessage.set(null);
    this.form.reset({ isActive: true });
    this.citiesFormArray.clear();
    this.form.get('code')?.enable();
    this.addCity();
    this.showModal.set(true);
  }

  edit(country: Country) {
    if (!this.authService.isAdmin()) return;
    
    this.isEditing.set(true);
    this.currentCode = country.code;
    this.errorMessage.set(null);
    
    this.citiesFormArray.clear();
    if (country.cities && country.cities.length > 0) {
      country.cities.forEach(c => this.citiesFormArray.push(this.createCityGroup(c)));
    } else {
      this.addCity();
    }

    this.form.patchValue({
      code: country.code,
      name: country.name,
      flagUrl: country.flagUrl,
      isActive: country.isActive
    });
    this.form.get('code')?.disable();
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.errorMessage.set("Unauthorized: You do not have permission to save locations.");
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const rawValue = this.form.getRawValue();
    const countryCode = rawValue.code;
    
    const citiesArray: City[] = rawValue.cities.filter((c: City) => c.code && c.name);

    const dataToSave = {
      name: rawValue.name,
      flagUrl: rawValue.flagUrl,
      isActive: rawValue.isActive,
      cities: citiesArray
    };

    try {
      await this.firebaseService.set(`countries/${countryCode}`, dataToSave);
      this.toastService.success('Location saved successfully.');
      this.closeModal();
    } catch (e: any) {
      if (e.message?.includes('PERMISSION_DENIED') || e.code === 'PERMISSION_DENIED') {
        this.errorMessage.set('Permission Denied.');
        this.toastService.error('Permission Denied.');
      } else {
        this.errorMessage.set('Save failed: ' + e.message);
        this.toastService.error('Save failed: ' + e.message);
      }
    }
  }

  delete(code: string) {
    if (!this.authService.isAdmin()) return;
    this.itemToDelete.set(code);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  async confirmDelete() {
    const code = this.itemToDelete();
    if (!code || !this.authService.isAdmin()) {
      this.closeConfirmModal();
      return;
    }

    try {
      await this.firebaseService.delete('countries', code);
      this.toastService.success('Country deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Failed to delete: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }
}