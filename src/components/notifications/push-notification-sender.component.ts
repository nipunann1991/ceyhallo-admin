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
      sendLater: [false],
      sendLaterAt: [''],
      customDataKey: ['routeId'],
      customDataValue: ['']
    });
  }

  get targetType() { return this.form.get('targetType')?.value; }
  get sendLaterEnabled() { return !!this.form.get('sendLater')?.value; }

  setTargetAll() {
    this.form.patchValue({ targetType: 'topic', targetValue: 'general' });
  }

  onSendLaterToggle(checked: boolean) {
    this.form.patchValue({ sendLater: checked });
    if (!checked) {
      this.form.patchValue({ sendLaterAt: '' });
    }
  }

  minDateTimeLocal() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

    const val = this.form.getRawValue();
    const sendLater = !!val.sendLater;
    if (sendLater && !val.sendLaterAt) {
      this.form.get('sendLaterAt')?.markAsTouched();
      this.toastService.error('Please choose a send date.');
      return;
    }

    if (sendLater) {
      const scheduledTime = new Date(val.sendLaterAt).getTime();
      if (Number.isNaN(scheduledTime) || scheduledTime <= Date.now()) {
        this.form.get('sendLaterAt')?.markAsTouched();
        this.toastService.error('Send date must be in the future.');
        return;
      }
    }

    this.isSending.set(true);

    let customData: Record<string, string> | null = null;
    if (val.customDataKey && val.customDataValue) {
      customData = { [val.customDataKey.trim()]: val.customDataValue.trim() };
    }

    const status = sendLater ? 'scheduled' : 'pending';

    const notificationPayload: any = {
      title: val.title,
      body: val.body,
      imageUrl: val.imageUrl,
      targetType: val.targetType,
      targetValue: val.targetValue ? val.targetValue.trim() : '',
      status,
      createdAt: new Date().toISOString()
    };

    if (customData) {
      notificationPayload.data = customData;
    }

    if (sendLater) {
      if (val.sendLaterAt) {
        notificationPayload['scheduledAt'] = new Date(val.sendLaterAt).toISOString();
      }
    }

    try {
      await this.firebaseService.create('push_queue', notificationPayload);
      this.toastService.success(sendLater ? 'Notification scheduled successfully!' : 'Notification queued successfully!');
      this.router.navigate(['/notifications']);
    } catch (e: any) {
      this.toastService.error(`Failed to ${sendLater ? 'schedule' : 'queue'} notification: ` + e.message);
    } finally {
      this.isSending.set(false);
    }
  }
}
