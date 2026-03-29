var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../ui/modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
let LocationsComponent = class LocationsComponent {
    constructor(authService, firebaseService, toastService, fb) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.fb = fb;
        this.countries = signal([]);
        this.searchQuery = signal('');
        this.filteredCountries = computed(() => {
            const query = this.searchQuery().toLowerCase();
            return this.countries().filter(c => c.name?.toLowerCase().includes(query) ||
                c.code?.toLowerCase().includes(query));
        });
        this.showModal = signal(false);
        this.isEditing = signal(false);
        this.currentCode = null;
        this.errorMessage = signal(null);
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
        this.form = this.fb.group({
            code: ['', [Validators.required, Validators.pattern(/^[A-Z]{2,3}$/)]],
            name: ['', Validators.required],
            flagUrl: [''],
            isActive: [true],
            cities: this.fb.array([])
        });
    }
    get citiesFormArray() {
        return this.form.get('cities');
    }
    createCityGroup(city = {}) {
        return this.fb.group({
            code: [city.code || '', [Validators.required, Validators.pattern(/^[A-Z0-9]+$/)]],
            name: [city.name || '', Validators.required],
            isActive: [city.isActive !== false] // Default to true if undefined
        });
    }
    addCity() {
        this.citiesFormArray.push(this.createCityGroup());
    }
    removeCity(index) {
        this.citiesFormArray.removeAt(index);
    }
    ngOnInit() {
        this.firebaseService.listenToPath('countries', (data) => {
            const mapped = data.map(country => {
                let citiesArray = [];
                if (country.cities) {
                    if (Array.isArray(country.cities)) {
                        citiesArray = country.cities.map((city) => ({
                            code: city.code,
                            name: city.name,
                            isActive: city.isActive !== false
                        })).filter((city) => city && city.code && city.name);
                    }
                    else if (typeof country.cities === 'object') {
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
            this.countries.set(mapped);
        });
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
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
    edit(country) {
        if (!this.authService.isAdmin())
            return;
        this.isEditing.set(true);
        this.currentCode = country.code;
        this.errorMessage.set(null);
        this.citiesFormArray.clear();
        if (country.cities && country.cities.length > 0) {
            country.cities.forEach(c => this.citiesFormArray.push(this.createCityGroup(c)));
        }
        else {
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
        const citiesArray = rawValue.cities.filter((c) => c.code && c.name);
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
        }
        catch (e) {
            if (e.message?.includes('PERMISSION_DENIED') || e.code === 'PERMISSION_DENIED') {
                this.errorMessage.set('Permission Denied.');
                this.toastService.error('Permission Denied.');
            }
            else {
                this.errorMessage.set('Save failed: ' + e.message);
                this.toastService.error('Save failed: ' + e.message);
            }
        }
    }
    delete(code) {
        if (!this.authService.isAdmin())
            return;
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
        }
        catch (e) {
            this.toastService.error('Failed to delete: ' + e.message);
        }
        finally {
            this.closeConfirmModal();
        }
    }
};
LocationsComponent = __decorate([
    Component({
        selector: 'app-locations',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
        templateUrl: './locations.component.html'
    })
], LocationsComponent);
export { LocationsComponent };
