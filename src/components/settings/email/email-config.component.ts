import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-email-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './email-config.component.html',
})
export class EmailConfigComponent implements OnInit {
  form: FormGroup;
  isSaving = signal(false);
  isLoading = signal(true);
  showPassword = signal(false);

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
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
    } catch (e) {
      this.toastService.error('Failed to load email settings.');
    } finally {
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
    } catch (e: any) {
      console.error('Save error:', e);
      if (e.message?.includes('permission-denied') || e.code === 'permission-denied') {
         this.toastService.error('Permission denied. Please try logging in again.');
      } else {
         this.toastService.error('Failed to save settings: ' + e.message);
      }
    } finally {
      this.isSaving.set(false);
    }
  }
}