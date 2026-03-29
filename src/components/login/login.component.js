var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
let LoginComponent = class LoginComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.fb = inject(FormBuilder);
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
        this.errorMessage = signal(null);
        this.isSubmitting = signal(false);
    }
    async onSubmit() {
        if (this.form.invalid)
            return;
        this.isSubmitting.set(true);
        this.errorMessage.set(null);
        const { email, password } = this.form.value;
        if (!email || !password)
            return;
        try {
            await this.authService.login(email, password);
        }
        catch (err) {
            // Standard error handling
            const code = err.code;
            if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
                this.errorMessage.set('Invalid email or password.');
            }
            else if (code === 'auth/too-many-requests') {
                this.errorMessage.set('Too many failed attempts. Please try again later.');
            }
            else {
                this.errorMessage.set('Login failed: ' + (err.message || 'Unknown error'));
            }
        }
        finally {
            this.isSubmitting.set(false);
        }
    }
};
LoginComponent = __decorate([
    Component({
        selector: 'app-login',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule],
        templateUrl: './login.component.html'
    })
], LoginComponent);
export { LoginComponent };
