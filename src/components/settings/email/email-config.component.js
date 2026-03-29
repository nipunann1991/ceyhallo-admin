var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
let EmailConfigComponent = class EmailConfigComponent {
    constructor(authService, firebaseService, toastService, fb) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.fb = fb;
        this.isSaving = signal(false);
        this.isLoading = signal(true);
        this.showPassword = signal(false);
        this.form = this.fb.group({
            smtpHost: ['', Validators.required],
            smtpPort: [465, [Validators.required, Validators.pattern(/^[0-9]+$/)]],
            smtpUser: ['', [Validators.required, Validators.email]],
            smtpPass: ['', Validators.required],
            fromName: ['', Validators.required],
            fromEmail: ['', [Validators.required, Validators.email]],
        });
    }
    ngOnInit() {
        this.loadData();
    }
    async loadData() {
        this.isLoading.set(true);
        try {
            const doc = await this.firebaseService.getDocument('settings', 'email_config');
            if (doc) {
                this.form.patchValue(doc);
            }
        }
        catch (e) {
            this.toastService.error('Failed to load email settings.');
        }
        finally {
            this.isLoading.set(false);
        }
    }
    async save() {
        if (!this.authService.isAdmin()) {
            this.toastService.error('Unauthorized action.');
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.toastService.error('Please fill all required fields.');
            return;
        }
        this.isSaving.set(true);
        try {
            const formVal = this.form.getRawValue();
            const dataToSave = {
                ...formVal,
                smtpPort: Number(formVal.smtpPort)
            };
            await this.firebaseService.set('settings/email_config', dataToSave);
            this.toastService.success('Email settings saved successfully.');
        }
        catch (e) {
            console.error('Save error:', e);
            if (e.message?.includes('permission-denied') || e.code === 'permission-denied') {
                this.toastService.error('Permission denied. Please try logging in again.');
            }
            else {
                this.toastService.error('Failed to save settings: ' + e.message);
            }
        }
        finally {
            this.isSaving.set(false);
        }
    }
};
EmailConfigComponent = __decorate([
    Component({
        selector: 'app-email-config',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule],
        templateUrl: './email-config.component.html',
    })
], EmailConfigComponent);
export { EmailConfigComponent };
