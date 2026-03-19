import { Component, signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-push-notification-sender',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './push-notification-sender.component.html'
})
export class PushNotificationSenderComponent {
  form: FormGroup;
  isSending = signal(false);
  isUploading = signal(false);

  constructor(
    private firebaseService: FirebaseService,
    private toastService: ToastService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      body: ['', [Validators.required, Validators.maxLength(500)]],
      imageUrl: [''],
      targetType: ['topic', Validators.required],
      targetValue: ['general', Validators.required],
      customDataKey: [''],
      customDataValue: ['']
    });
  }

  get targetType() { return this.form.get('targetType')?.value; }

  setTargetAll() {
    this.form.patchValue({ targetType: 'topic', targetValue: 'general' });
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.isUploading.set(true);
    try {
      const path = `notifications/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.form.patchValue({ imageUrl: url });
    } catch (e) {
      this.toastService.error('Image upload failed');
    } finally {
      this.isUploading.set(false);
    }
  }

  async send() {
    if (this.form.invalid) return;
    
    this.isSending.set(true);
    const val = this.form.getRawValue();

    let customData = null;
    if (val.customDataKey && val.customDataValue) {
      customData = { [val.customDataKey]: val.customDataValue };
    }

    const notificationPayload = {
      title: val.title,
      body: val.body,
      imageUrl: val.imageUrl,
      targetType: val.targetType,
      targetValue: val.targetValue ? val.targetValue.trim() : '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      data: customData
    };

    try {
      await this.firebaseService.create('push_queue', notificationPayload);
      this.toastService.success('Notification queued successfully!');
      this.router.navigate(['/notifications']);
    } catch (e: any) {
      this.toastService.error('Failed to queue notification: ' + e.message);
    } finally {
      this.isSending.set(false);
    }
  }
}