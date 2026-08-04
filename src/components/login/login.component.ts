import { Component, inject } from '@angular/core';
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
  errorMessage = this.authService.error;
  isSubmitting = this.authService.isLoading;
  
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit() {
    if (this.form.invalid) return;

    const { email, password } = this.form.value;

    if (!email || !password) return;

    try {
      await this.authService.login(email, password);
    } catch {
      // AuthService stores the user-facing error in NGRX.
    }
  }
}
