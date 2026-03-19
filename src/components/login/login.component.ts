import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  authService = inject(AuthService);
  fb: FormBuilder = inject(FormBuilder);
  
  form = this.fb.group({
    email: ['admin@ceyhallo.com', [Validators.required, Validators.email]],
    password: ['12345678', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage = signal<string | null>(null);
  isSubmitting = signal(false);

  async onSubmit() {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.value;

    if (!email || !password) return;

    try {
      await this.authService.login(email, password);
    } catch (err: any) {
      // Auto-provisioning logic for the demo Super Admin
      // If login fails for the specific admin email, attempt to create the account.
      if (email === 'admin@ceyhallo.com') {
        try {
          // Attempt registration (auto-create admin if missing for demo)
          await this.authService.register(email, password);
          return; 
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
             this.errorMessage.set('Invalid email or password.');
          } else if (regErr.code === 'auth/weak-password') {
             this.errorMessage.set('Password should be at least 6 characters.');
          } else if (regErr.code === 'auth/operation-not-allowed') {
             this.errorMessage.set('Email/Password login is not enabled in Firebase Console.');
          } else {
             this.errorMessage.set('Error: ' + (regErr.message || 'Could not sign in.'));
          }
        }
      } else {
        // Standard error handling
        const code = err.code;
        if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
          this.errorMessage.set('Invalid email or password.');
        } else if (code === 'auth/too-many-requests') {
          this.errorMessage.set('Too many failed attempts. Please try again later.');
        } else {
          this.errorMessage.set('Login failed: ' + (err.message || 'Unknown error'));
        }
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}