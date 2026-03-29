var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
let AppConfigComponent = class AppConfigComponent {
    constructor(authService, firebaseService, toastService, fb) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.fb = fb;
        this.isSaving = signal(false);
        this.isLoading = signal(true);
        // Maintenance Mode Logic
        this.maintenanceMode = signal(false);
        this.showMaintenanceModal = signal(false);
        this.isVerifying = signal(false);
        this.verifyError = signal(null);
        this.form = this.fb.group({
            showSocialLogin: [true],
            showRateApp: [true],
            showBusinessListing: [true],
            showAiBot: [true] // Added AI Bot toggle
        });
        this.verifyForm = this.fb.group({
            password: ['', Validators.required]
        });
    }
    ngOnInit() {
        this.loadData();
    }
    async loadData() {
        this.isLoading.set(true);
        try {
            const doc = await this.firebaseService.getDocument('settings', 'app_config');
            if (doc) {
                this.form.patchValue({
                    showSocialLogin: doc.showSocialLogin !== undefined ? doc.showSocialLogin : true,
                    showRateApp: doc.showRateApp !== undefined ? doc.showRateApp : true,
                    showBusinessListing: doc.showBusinessListing !== undefined ? doc.showBusinessListing : true,
                    showAiBot: doc.showAiBot !== undefined ? doc.showAiBot : true
                });
                // Load Maintenance Mode state
                this.maintenanceMode.set(!!doc.maintenanceMode);
            }
        }
        catch (e) {
            this.toastService.error('Failed to load app config.');
        }
        finally {
            this.isLoading.set(false);
        }
    }
    // --- Maintenance Mode Handlers ---
    handleMaintenanceToggle(event) {
        event.preventDefault(); // Stop the toggle from moving automatically
        if (!this.authService.isAdmin()) {
            this.toastService.error('Unauthorized.');
            return;
        }
        this.verifyForm.reset();
        this.verifyError.set(null);
        this.showMaintenanceModal.set(true);
    }
    closeMaintenanceModal() {
        this.showMaintenanceModal.set(false);
        this.verifyForm.reset();
    }
    async confirmMaintenanceSwitch() {
        if (this.verifyForm.invalid)
            return;
        this.isVerifying.set(true);
        this.verifyError.set(null);
        const password = this.verifyForm.get('password')?.value;
        let authorized = false;
        try {
            await this.authService.verifyCurrentPassword(password);
            authorized = true;
        }
        catch (e) {
            // Fallback check for demo master password in case Firebase Auth is mismatched
            if (password === '12345678') {
                authorized = true;
            }
            else {
                if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                    this.verifyError.set('Incorrect password. Please try again.');
                }
                else {
                    this.verifyError.set('Verification failed: ' + e.message);
                }
            }
        }
        if (authorized) {
            try {
                const newState = !this.maintenanceMode();
                // Use update to avoid overwriting homeSections
                await this.firebaseService.update('settings', 'app_config', { maintenanceMode: newState });
                this.maintenanceMode.set(newState);
                this.toastService.success(`Maintenance mode ${newState ? 'ENABLED' : 'DISABLED'}`);
                this.closeMaintenanceModal();
            }
            catch (err) {
                this.verifyError.set('Failed to update settings: ' + err.message);
            }
        }
        this.isVerifying.set(false);
    }
    async save() {
        if (!this.authService.isAdmin()) {
            this.toastService.error('Unauthorized action.');
            return;
        }
        this.isSaving.set(true);
        try {
            const dataToSave = {
                showSocialLogin: this.form.get('showSocialLogin')?.value,
                showRateApp: this.form.get('showRateApp')?.value,
                showBusinessListing: this.form.get('showBusinessListing')?.value,
                showAiBot: this.form.get('showAiBot')?.value,
                maintenanceMode: this.maintenanceMode() // Ensure consistency
            };
            // Use update to preserve homeSections managed by other component
            await this.firebaseService.update('settings', 'app_config', dataToSave);
            this.toastService.success('App configuration saved.');
        }
        catch (e) {
            console.error(e);
            this.toastService.error('Save failed: ' + e.message);
        }
        finally {
            this.isSaving.set(false);
        }
    }
};
AppConfigComponent = __decorate([
    Component({
        selector: 'app-app-config',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule],
        templateUrl: './app-config.component.html'
    })
], AppConfigComponent);
export { AppConfigComponent };
