var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
let PushNotificationSenderComponent = class PushNotificationSenderComponent {
    constructor(firebaseService, toastService, router, fb) {
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.router = router;
        this.fb = fb;
        this.isSending = signal(false);
        this.isUploading = signal(false);
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
    onSendLaterToggle(checked) {
        this.form.patchValue({ sendLater: checked });
        if (!checked) {
            this.form.patchValue({ sendLaterAt: '' });
        }
    }
    minDateTimeLocal() {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        const year = now.getFullYear();
        const month = pad(now.getMonth() + 1);
        const day = pad(now.getDate());
        const hours = pad(now.getHours());
        const minutes = pad(now.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    async onImageSelected(event) {
        const input = event.target;
        if (!input.files?.length)
            return;
        const file = input.files[0];
        this.isUploading.set(true);
        try {
            const path = `notifications/${Date.now()}_${file.name.replace(/\W+/g, '_')}`;
            const url = await this.firebaseService.uploadFile(path, file);
            this.form.patchValue({ imageUrl: url });
        }
        catch (e) {
            this.toastService.error('Image upload failed');
        }
        finally {
            this.isUploading.set(false);
        }
    }
    async send() {
        if (this.form.invalid)
            return;
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
        let customData = null;
        if (val.customDataKey && val.customDataValue) {
            customData = { [val.customDataKey]: val.customDataValue };
        }
        const status = sendLater ? 'scheduled' : 'pending';
        const notificationPayload = {
            title: val.title,
            body: val.body,
            imageUrl: val.imageUrl,
            targetType: val.targetType,
            targetValue: val.targetValue ? val.targetValue.trim() : '',
            status,
            createdAt: new Date().toISOString(),
            data: customData
        };
        if (sendLater) {
            notificationPayload['scheduledAt'] = new Date(val.sendLaterAt).toISOString();
        }
        try {
            await this.firebaseService.create('push_queue', notificationPayload);
            this.toastService.success(sendLater ? 'Notification scheduled successfully!' : 'Notification queued successfully!');
            this.router.navigate(['/notifications']);
        }
        catch (e) {
            this.toastService.error(`Failed to ${sendLater ? 'schedule' : 'queue'} notification: ` + e.message);
        }
        finally {
            this.isSending.set(false);
        }
    }
};
PushNotificationSenderComponent = __decorate([
    Component({
        selector: 'app-push-notification-sender',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, RouterLink],
        schemas: [NO_ERRORS_SCHEMA],
        templateUrl: './push-notification-sender.component.html'
    })
], PushNotificationSenderComponent);
export { PushNotificationSenderComponent };
