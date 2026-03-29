var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RichTextEditorComponent } from '../ui/rich-text-editor.component';
let JobEditorComponent = class JobEditorComponent {
    constructor(authService, firebaseService, toastService, route, router, fb) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.route = route;
        this.router = router;
        this.fb = fb;
        this.isEditing = signal(false);
        this.isUploading = signal(false);
        this.currentId = null;
        this.locations = signal([]);
        this.availableCities = signal([]);
        this.categories = signal([]);
        this.form = this.fb.group({
            title: ['', Validators.required],
            company: ['', Validators.required],
            category: ['', Validators.required],
            companyLogo: [''],
            location: ['', Validators.required],
            jobType: ['Full-time', Validators.required],
            salaryRange: [''],
            description: ['', Validators.required],
            isPublished: [true], // New field
            isFeatured: [false],
            countryCode: ['AE', Validators.required],
            cityCode: ['DXB', Validators.required],
            postedDate: [new Date().toISOString().slice(0, 10), Validators.required],
            responsibilities: this.fb.array([]),
            qualifications: this.fb.array([]),
            skills: this.fb.array([])
        });
    }
    get responsibilitiesArray() { return this.form.get('responsibilities'); }
    get qualificationsArray() { return this.form.get('qualifications'); }
    get skillsArray() { return this.form.get('skills'); }
    addItem(array, value = '') {
        array.push(this.fb.control(value, Validators.required));
    }
    removeItem(array, index) {
        array.removeAt(index);
    }
    ngOnInit() {
        // Use the shared business taxonomy for jobs as well
        this.firebaseService.listenToPath('taxonomy_business', (data) => {
            this.categories.set(data.sort((a, b) => a.name.localeCompare(b.name)));
        });
        this.firebaseService.listenToPath('countries', (data) => {
            const mappedLocations = data.map(country => {
                let citiesArray = [];
                if (country.cities) {
                    if (Array.isArray(country.cities)) {
                        citiesArray = country.cities;
                    }
                    else {
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
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditing.set(true);
            this.currentId = id;
            this.loadData(id);
        }
        else {
            this.addItem(this.responsibilitiesArray);
            this.addItem(this.qualificationsArray);
            this.addItem(this.skillsArray);
        }
    }
    async loadData(id) {
        try {
            const doc = await this.firebaseService.getDocument('jobs', id);
            if (doc) {
                if (doc.countryCode)
                    this.updateCitiesForCountry(doc.countryCode);
                this.form.patchValue({
                    title: doc.title,
                    company: doc.company,
                    category: doc.category,
                    companyLogo: doc.companyLogo,
                    location: doc.location,
                    jobType: doc.jobType,
                    salaryRange: doc.salaryRange,
                    description: doc.description,
                    isPublished: doc.isPublished !== false,
                    isFeatured: doc.isFeatured,
                    countryCode: doc.countryCode,
                    cityCode: doc.cityCode,
                    postedDate: doc.postedDate ? doc.postedDate.substring(0, 10) : ''
                });
                this.responsibilitiesArray.clear();
                if (doc.responsibilities)
                    doc.responsibilities.forEach((r) => this.addItem(this.responsibilitiesArray, r));
                this.qualificationsArray.clear();
                if (doc.qualifications)
                    doc.qualifications.forEach((q) => this.addItem(this.qualificationsArray, q));
                this.skillsArray.clear();
                if (doc.skills)
                    doc.skills.forEach((s) => this.addItem(this.skillsArray, s));
            }
        }
        catch (e) {
            this.toastService.error('Failed to load job data');
            this.router.navigate(['/jobs']);
        }
    }
    onCountryChange() {
        const code = this.form.get('countryCode')?.value;
        this.updateCitiesForCountry(code);
        const cities = this.availableCities();
        if (cities.length > 0)
            this.form.patchValue({ cityCode: cities[0].code });
        else
            this.form.patchValue({ cityCode: '' });
    }
    updateCitiesForCountry(countryCode) {
        const country = this.locations().find(c => c.code === countryCode);
        this.availableCities.set(country ? country.cities : []);
    }
    async onLogoSelected(event) {
        const input = event.target;
        if (!input.files?.length)
            return;
        const file = input.files[0];
        this.isUploading.set(true);
        try {
            const path = `jobs/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
            const url = await this.firebaseService.uploadFile(path, file);
            this.form.patchValue({ companyLogo: url });
        }
        catch (e) {
            this.toastService.error('Upload failed');
        }
        finally {
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
        const raw = this.form.getRawValue();
        const dataToSave = {
            ...raw,
            postedDate: new Date(raw.postedDate).toISOString(),
            responsibilities: raw.responsibilities.filter(s => s.trim()),
            qualifications: raw.qualifications.filter(s => s.trim()),
            skills: raw.skills.filter(s => s.trim())
        };
        if (!this.isEditing()) {
            dataToSave.createdDate = new Date().toISOString();
            dataToSave.publishedDate = new Date().toISOString();
        }
        try {
            if (this.isEditing() && this.currentId) {
                await this.firebaseService.update('jobs', this.currentId, dataToSave);
                this.toastService.success('Job updated');
            }
            else {
                await this.firebaseService.create('jobs', dataToSave);
                this.toastService.success('Job created');
            }
            this.router.navigate(['/jobs']);
        }
        catch (e) {
            this.toastService.error('Save failed: ' + e.message);
        }
    }
};
JobEditorComponent = __decorate([
    Component({
        selector: 'app-job-editor',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent],
        templateUrl: './job-editor.component.html'
    })
], JobEditorComponent);
export { JobEditorComponent };
