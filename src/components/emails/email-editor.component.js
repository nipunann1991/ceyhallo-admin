var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, ViewChild, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Quill from 'quill';
const BASE_TEMPLATE = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <!--[if mso]>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    <style>
      td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
    </style>
  <![endif]-->
  <title>[Email Title]</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" media="screen">
  <style>
    @media (max-width: 600px) {
      .sm-w-full {
        width: 100% !important;
      }
      .sm-px-6 {
        padding-left: 24px !important;
        padding-right: 24px !important;
      }
      .sm-py-8 {
        padding-top: 32px !important;
        padding-bottom: 32px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; width: 100%; padding: 0; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #F2F4F7;">
  <div style="font-family: 'Inter', sans-serif; mso-line-height-rule: exactly; display: none;">A message from CeyHallo</div>
  <div role="article" aria-roledescription="email" aria-label="[Email Title]" lang="en" style="font-family: 'Inter', sans-serif; mso-line-height-rule: exactly;">
    <table style="width: 100%; font-family: 'Inter', sans-serif;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="mso-line-height-rule: exactly; background-color: #F2F4F7; padding-top: 24px; padding-bottom: 24px;">
          <table class="sm-w-full" style="width: 600px;" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td class="sm-py-8 sm-px-6" style="mso-line-height-rule: exactly; padding: 40px; text-align: center;">
                <a href="https://ceyhallo.com" target="_blank">
                  <img src="https://i.ibb.co/B5TnYXWN/logo.png" width="120" alt="CeyHallo" style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0;">
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" class="sm-px-6">
                <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td class="sm-px-6" style="mso-line-height-rule: exactly; border-radius: 16px; background-color: #ffffff; padding: 40px; text-align: left; font-size: 16px; line-height: 24px; color: #4B5563;">
                      [CONTENT_BODY]
                    </td>
                  </tr>
                  <tr>
                    <td style="height: 48px;"></td>
                  </tr>
                  <tr>
                    <td style="mso-line-height-rule: exactly; padding-left: 24px; padding-right: 24px; text-align: center; font-size: 12px; color: #9CA3AF;">
                      <p style="margin: 0 0 8px;">
                        You received this email because you signed up for CeyHallo. You can manage your notification preferences in the app settings.
                      </p>
                      <p style="cursor: default;">
                        <a href="#" target="_blank" style="color: #9CA3AF; text-decoration: none;">Facebook</a> &bull;
                        <a href="#" target="_blank" style="color: #9CA3AF; text-decoration: none;">Instagram</a> &bull;
                        <a href="#" target="_blank" style="color: #9CA3AF; text-decoration: none;">Twitter</a>
                      </p>
                      <p style="margin: 0; color: #9CA3AF;">
                        &copy; 2024 CeyHallo. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
const NEW_TEMPLATE_CONTENT = `
<h1 style="margin-top: 0; margin-bottom: 24px; font-size: 24px; font-weight: 700; line-height: 1.2; color: #1A1C1E;">
  Your Email Title Here
</h1>
<p style="margin: 0 0 24px;">
  This is where your main content goes. You can edit this text, add more paragraphs, and use the toolbar to format it.
</p>
<table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 0 24px;">
  <tr>
    <td style="mso-line-height-rule: exactly; mso-padding-alt: 12px 24px; border-radius: 9999px; background-color: #083594;">
      <a href="https://your-link-here.com" target="_blank" style="display: block; font-weight: 600; font-size: 14px; line-height: 100%; color: #ffffff; padding: 12px 24px; text-decoration: none;">
        Call to Action &rarr;
      </a>
    </td>
  </tr>
</table>
<table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td style="mso-line-height-rule: exactly; padding-top: 16px; padding-bottom: 16px;">
      <div style="height: 1px; background-color: #E5E7EB; line-height: 1px;">&zwnj;</div>
    </td>
  </tr>
</table>
<p style="margin: 0;">
  Thanks,<br>The CeyHallo Team
</p>
`;
let EmailEditorComponent = class EmailEditorComponent {
    constructor(authService, firebaseService, toastService, route, router, fb, sanitizer, cdr) {
        this.authService = authService;
        this.firebaseService = firebaseService;
        this.toastService = toastService;
        this.route = route;
        this.router = router;
        this.fb = fb;
        this.sanitizer = sanitizer;
        this.cdr = cdr;
        this.isEditing = signal(false);
        this.isSaving = signal(false);
        this.currentId = null;
        this.showPreview = signal(false);
        this.showSendModal = signal(false);
        this.isSending = signal(false);
        this.previewContent = signal(null);
        this.showSource = signal(false);
        this.form = this.fb.group({
            name: ['', Validators.required],
            subject: ['', Validators.required],
            htmlContent: [''],
        });
        this.sendForm = this.fb.group({
            audience: ['all', Validators.required],
            testEmail: ['', [Validators.email]]
        });
    }
    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditing.set(true);
            this.currentId = id;
            this.loadData(id);
        }
        else {
            this.form.patchValue({ htmlContent: NEW_TEMPLATE_CONTENT });
        }
    }
    ngAfterViewInit() {
        this.setupQuill();
    }
    setupQuill() {
        if (this.quill || !this.editorContainer)
            return;
        this.quill = new Quill(this.editorContainer.nativeElement, { theme: 'snow' });
        const currentContent = this.form.get('htmlContent')?.value;
        if (currentContent) {
            this.quill.clipboard.dangerouslyPasteHTML(currentContent);
        }
        this.quill.on('text-change', () => {
            if (!this.showSource()) {
                const html = this.quill.root.innerHTML;
                this.form.patchValue({ htmlContent: html }, { emitEvent: false });
            }
        });
    }
    toggleSource() {
        this.showSource.update(v => !v);
        this.cdr.detectChanges();
        if (this.showSource()) {
            const html = this.quill.root.innerHTML;
            this.form.patchValue({ htmlContent: html });
        }
        else {
            setTimeout(() => {
                if (!this.quill)
                    this.setupQuill();
                const html = this.form.get('htmlContent')?.value || '';
                this.quill.clipboard.dangerouslyPasteHTML(html);
            }, 0);
        }
    }
    async loadData(id) {
        try {
            const doc = await this.firebaseService.getDocument('email_templates', id);
            if (doc) {
                this.form.patchValue(doc);
                if (this.quill) {
                    this.quill.clipboard.dangerouslyPasteHTML(doc.htmlContent);
                }
            }
        }
        catch (e) {
            this.toastService.error('Failed to load template');
        }
    }
    async save() {
        if (this.form.invalid)
            return;
        this.isSaving.set(true);
        const val = this.form.getRawValue();
        const dataToSave = {
            name: val.name,
            subject: val.subject,
            htmlContent: val.htmlContent,
            updatedAt: new Date().toISOString(),
            createdBy: this.authService.currentUser()?.name || 'Admin',
        };
        try {
            if (this.isEditing() && this.currentId) {
                await this.firebaseService.update('email_templates', this.currentId, dataToSave);
                this.toastService.success('Template updated.');
            }
            else {
                const data = { ...dataToSave, createdAt: new Date().toISOString() };
                const newDoc = await this.firebaseService.create('email_templates', data);
                this.toastService.success('Template created.');
                this.router.navigate(['/emails', 'edit', newDoc.id]);
            }
        }
        catch (e) {
            this.toastService.error('Save failed: ' + e.message);
        }
        finally {
            this.isSaving.set(false);
        }
    }
    openPreview() {
        const editorContent = this.form.get('htmlContent')?.value || '';
        this.previewContent.set(this.sanitizer.sanitize(SecurityContext.HTML, editorContent));
        this.showPreview.set(true);
    }
    async queueEmail() {
        if (this.sendForm.invalid)
            return;
        const sendVal = this.sendForm.getRawValue();
        if (sendVal.audience === 'test' && !sendVal.testEmail) {
            this.toastService.error('Please enter a test email address.');
            return;
        }
        this.isSending.set(true);
        const editorContent = this.form.get('htmlContent')?.value;
        const subject = this.form.get('subject')?.value;
        const fullHtmlToSend = BASE_TEMPLATE
            .replace(/\[Email Title\]/g, subject)
            .replace('[CONTENT_BODY]', editorContent);
        const job = {
            templateId: this.currentId,
            subject: subject,
            htmlContent: fullHtmlToSend,
            target: sendVal,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        try {
            await this.firebaseService.create('email_queue', job);
            this.toastService.success('Email has been queued for sending.');
            this.showSendModal.set(false);
        }
        catch (e) {
            this.toastService.error('Failed to queue email: ' + e.message);
        }
        finally {
            this.isSending.set(false);
        }
    }
};
__decorate([
    ViewChild('editorContainer')
], EmailEditorComponent.prototype, "editorContainer", void 0);
EmailEditorComponent = __decorate([
    Component({
        selector: 'app-email-editor',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, RouterLink],
        templateUrl: './email-editor.component.html',
    })
], EmailEditorComponent);
export { EmailEditorComponent };
