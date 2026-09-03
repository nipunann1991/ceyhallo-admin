import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FirebaseService } from '../../../services/firebase.service';
import { ToastService } from '../../../services/toast.service';
import { ModalComponent } from '../../ui/modal.component';
import { InvoicePreviewComponent } from '../invoice-preview/invoice-preview.component';
import { Business } from '../../../models/business.model';
import { PricingItem, PricingSettings } from '../../../models/pricing.model';
import { invoicePricingOptions } from '../../../utils/pricing';

@Component({
  selector: 'app-invoice-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ModalComponent, InvoicePreviewComponent],
  templateUrl: './invoice-editor.component.html'
})
export class InvoiceEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly showPreview = signal(false);
  readonly currentStep = signal(1);
  readonly businesses = signal<Business[]>([]);
  readonly pricingItems = signal<PricingItem[]>([]);
  readonly companyDetails = signal({ companyName: 'CeyHallo', address: '', businessRegistrationNumber: '', contactNumber: '' });
  readonly businessSearch = signal('');
  readonly showBusinessResults = signal(false);
  private currentId: string | null = null;

  readonly filteredBusinesses = computed(() => {
    const query = this.businessSearch().trim().toLowerCase();
    return this.businesses()
      .filter(business => !business.isArchived && (!query || [business.title, business.category, business.location].some(value => value?.toLowerCase().includes(query))))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 12);
  });

  readonly form = this.fb.group({
    invoiceNumber: ['Generating...', Validators.required],
    businessId: ['', Validators.required],
    customerName: ['', Validators.required],
    customerEmail: ['', [Validators.required, Validators.email]],
    businessAddress: [''],
    issueDate: [this.dateInputValue(new Date()), Validators.required],
    paymentTerms: ['on_demand', Validators.required],
    dueDate: [this.dateInputValue(new Date()), Validators.required],
    currency: ['AED', Validators.required],
    taxRate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    status: ['draft', Validators.required],
    notes: [''],
    paymentMethod: ['Cash', Validators.required],
    sendByEmail: [true],
    items: this.fb.array([this.createItem()])
  });

  get items(): FormArray { return this.form.controls.items; }
  readonly subtotal = signal(0);
  readonly taxAmount = signal(0);
  readonly total = signal(0);

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.updateTotals());
    this.updateTotals();
    const id = this.route.snapshot.paramMap.get('id');
    this.firebaseService.listenToPath<Business>('businesses', data => this.businesses.set(data));
    this.firebaseService.listenToDocument<PricingSettings>('settings', 'pricing_subscriptions', settings => {
      this.pricingItems.set(invoicePricingOptions(settings?.items || []));
    });
    this.firebaseService.listenToDocument<any>('settings', 'app_config', config => {
      const details = config?.companyDetails || {};
      this.companyDetails.set({
        companyName: details.companyName || config?.companyName || 'CeyHallo',
        address: details.address || config?.companyAddress || '',
        businessRegistrationNumber: details.businessRegistrationNumber || config?.businessRegistrationNumber || '',
        contactNumber: details.contactNumber || config?.contactNumber || ''
      });
    });
    if (id) {
      this.currentId = id;
      this.isEditing.set(true);
      this.loadInvoice(id);
    } else {
      this.generateInvoiceNumber();
    }
  }

  private async generateInvoiceNumber(): Promise<void> {
    const year = new Date().getFullYear();
    try {
      const invoices = await this.firebaseService.getCollection<any>('invoices');
      const highest = invoices.reduce((max, invoice) => {
        const match = String(invoice.invoiceNumber || '').match(new RegExp(`^INV-${year}-(\\d+)$`));
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
      this.form.controls.invoiceNumber.setValue(`INV-${year}-${String(highest + 1).padStart(4, '0')}`);
    } catch {
      this.form.controls.invoiceNumber.setValue(`INV-${year}-${String(Date.now()).slice(-6)}`);
    }
  }

  updateBusinessSearch(event: Event): void {
    this.businessSearch.set((event.target as HTMLInputElement).value);
    this.showBusinessResults.set(true);
  }

  selectBusiness(business: Business): void {
    const email = (business.contact as any)?.email || '';
    const primaryLocation = business.locations?.find(location => location.isPrimary) || business.locations?.[0];
    const address = primaryLocation?.location || business.location || '';
    this.form.patchValue({ businessId: business.id, customerName: business.title, customerEmail: email, businessAddress: address });
    this.businessSearch.set(business.title);
    this.showBusinessResults.set(false);
  }

  updateDueDate(): void {
    const issueDate = this.form.controls.issueDate.value;
    const terms = this.form.controls.paymentTerms.value;
    if (!issueDate || terms === 'custom') return;
    const days = terms === 'on_demand' ? 0 : Number(terms);
    const dueDate = new Date(`${issueDate}T00:00:00`);
    dueDate.setDate(dueDate.getDate() + days);
    this.form.controls.dueDate.setValue(this.dateInputValue(dueDate));
  }

  toggleCustomDueDate(): void {
    const isCustom = this.form.controls.paymentTerms.value === 'custom';
    this.form.controls.paymentTerms.setValue(isCustom ? 'on_demand' : 'custom');
    if (isCustom) this.updateDueDate();
  }

  private createItem(item?: any) {
    return this.fb.group({
      pricingId: [item?.pricingId || ''],
      description: [item?.description || '', Validators.required],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]]
    });
  }

  addItem(): void { this.items.push(this.createItem()); }
  removeItem(index: number): void { if (this.items.length > 1) this.items.removeAt(index); }
  refreshTotals(): void { this.updateTotals(); }

  selectPricingItem(index: number, pricingId: string): void {
    const line = this.items.at(index);
    line.get('pricingId')?.setValue(pricingId);
    if (!pricingId) return;
    const pricing = this.pricingItems().find(item => item.id === pricingId);
    if (!pricing) return;
    const billing = pricing.billingPeriod !== 'one_time' ? pricing.billingPeriod : pricing.billingLabel;
    const period = billing ? ` (${billing})` : '';
    line.patchValue({ description: `${pricing.description || pricing.name}${period}`, unitPrice: pricing.price });
    if (pricing.priceMode === 'from') this.toastService.info('Starting price applied. Confirm the final unit price before saving this invoice.');
  }

  nextStep(): void {
    const controls = this.currentStep() === 1
      ? ['invoiceNumber', 'businessId', 'customerName', 'issueDate', 'dueDate', 'currency']
      : ['items', 'taxRate'];
    controls.forEach(name => this.form.get(name)?.markAllAsTouched());
    if (controls.some(name => this.form.get(name)?.invalid)) {
      this.toastService.error(this.currentStep() === 1 ? 'Complete the invoice and customer details.' : 'Complete at least one valid line item.');
      return;
    }
    this.currentStep.update(step => Math.min(3, step + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previousStep(): void {
    this.currentStep.update(step => Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToStep(step: number): void {
    if (step < this.currentStep()) this.currentStep.set(step);
  }

  previewData(): any {
    return { ...this.form.getRawValue(), subtotal: this.subtotal(), taxAmount: this.taxAmount(), total: this.total() };
  }

  private updateTotals(): void {
    const subtotal = this.items.controls.reduce((sum, control) => sum + (Number(control.get('quantity')?.value) || 0) * (Number(control.get('unitPrice')?.value) || 0), 0);
    const taxAmount = subtotal * (Number(this.form.controls.taxRate.value) || 0) / 100;
    this.subtotal.set(subtotal);
    this.taxAmount.set(taxAmount);
    this.total.set(subtotal + taxAmount);
  }

  private async loadInvoice(id: string): Promise<void> {
    try {
      const invoice = await this.firebaseService.getDocument('invoices', id);
      if (!invoice) throw new Error('Invoice not found');
      this.form.patchValue({ ...invoice, sendByEmail: false });
      if (!invoice.paymentMethod && Array.isArray(invoice.paymentMethods)) {
        this.form.controls.paymentMethod.setValue(invoice.paymentMethods[0] || 'Cash');
      }
      this.businessSearch.set(invoice.customerName || '');
      this.items.clear();
      (invoice.items || []).forEach((item: any) => this.items.push(this.createItem(item)));
      if (!this.items.length) this.addItem();
      this.updateTotals();
    } catch (error: any) {
      this.toastService.error(error.message || 'Failed to load invoice.');
      this.router.navigate(['/invoices']);
    }
  }

  async save(): Promise<void> {
    if (!this.authService.canManageContent()) {
      this.toastService.error('Unauthorized');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Please complete the required fields.');
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    const now = new Date().toISOString();
    const sendByEmail = !!raw.sendByEmail;
    const data = {
      invoiceNumber: raw.invoiceNumber!, businessId: raw.businessId!, customerName: raw.customerName!, customerEmail: raw.customerEmail!, businessAddress: raw.businessAddress || '',
      issueDate: raw.issueDate!, paymentTerms: raw.paymentTerms!, dueDate: raw.dueDate!, currency: raw.currency!, taxRate: Number(raw.taxRate),
      notes: raw.notes || '', paymentMethod: raw.paymentMethod!, items: raw.items, subtotal: this.subtotal(), taxAmount: this.taxAmount(), total: this.total(),
      status: sendByEmail ? 'sent' : raw.status!, updatedAt: now,
      ...(this.isEditing() ? {} : { createdAt: now }), ...(sendByEmail ? { sentAt: now } : {})
    };

    try {
      let invoiceId = this.currentId;
      if (this.isEditing() && invoiceId) await this.firebaseService.update('invoices', invoiceId, data);
      else invoiceId = (await this.firebaseService.create('invoices', data)).id;

      if (sendByEmail) {
        await this.firebaseService.create('email_queue', {
          to: raw.customerEmail, subject: `Invoice ${raw.invoiceNumber}`,
          htmlContent: this.invoiceEmailHtml(raw.customerName!, raw.invoiceNumber!, raw.currency!, this.total(), raw.dueDate!),
          channel: 'email', provider: 'invoice', status: 'pending', createdAt: now,
          invoiceId, target: { audience: 'invoice', testEmail: raw.customerEmail, template: 'invoice' }
        });
      }
      this.toastService.success(sendByEmail ? 'Invoice saved and queued for email.' : 'Invoice saved.');
      this.router.navigate(['/invoices']);
    } catch (error: any) {
      this.toastService.error('Save failed: ' + error.message);
    } finally {
      this.isSaving.set(false);
    }
  }

  private invoiceEmailHtml(name: string, number: string, currency: string, total: number, dueDate: string): string {
    const logo = 'https://firebasestorage.googleapis.com/v0/b/ceyhallo-eu/o/uploads%2F1775977446535_logo.png?alt=media&token=2fdb63e1-ee1e-4ae8-8cf7-14fc6438439a';
    const paymentText = this.form.controls.paymentTerms.value === 'on_demand'
      ? 'Payment is due on demand.'
      : `Payment is due on ${this.escape(dueDate)}.`;
    const method = this.escape(this.form.controls.paymentMethod.value || 'Cash');
    const company = this.companyDetails();
    const companyAddress = company.address ? `<div style="margin-top:5px;font-size:12px;line-height:1.6;color:#64748b">${this.escape(company.address).replace(/\n/g, '<br>')}</div>` : '';
    const companyMeta = [company.businessRegistrationNumber ? `<strong>Registration:</strong> ${this.escape(company.businessRegistrationNumber)}` : '', company.contactNumber ? `<strong>Contact:</strong> ${this.escape(company.contactNumber)}` : ''].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
    return `<div style="margin:0;padding:40px 16px;background:#f1f3f7;font-family:Arial,sans-serif;color:#334155"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden"><div style="padding:28px 40px 24px;text-align:center"><img src="${logo}" alt="CeyHallo" style="display:inline-block;max-width:240px;max-height:112px;width:auto;height:auto"><div style="margin-top:12px;font-size:16px;font-weight:800;color:#111827">${this.escape(company.companyName || 'CeyHallo')}</div>${companyAddress}${companyMeta ? `<div style="margin-top:7px;font-size:12px;color:#64748b">${companyMeta}</div>` : ''}</div><div style="padding:24px 40px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#083594;margin-bottom:8px">Invoice</div><h1 style="margin:0;font-size:26px;color:#111827">${this.escape(number)}</h1></div><div style="padding:32px 40px"><h2 style="margin:0 0 20px;font-size:20px;color:#111827">Hello ${this.escape(name)},</h2><p style="margin:0 0 24px;line-height:1.7">Your invoice is ready. The total amount is:</p><div style="padding:20px;border:1px solid #cbdcff;border-radius:12px;background:#edf3ff;text-align:center;font-size:28px;font-weight:800;color:#083594">${this.escape(currency)} ${total.toFixed(2)}</div><p style="margin:24px 0 8px;line-height:1.7">${paymentText}</p><p style="margin:0;line-height:1.7"><strong>Payment:</strong> ${method}</p><div style="margin-top:32px;padding-top:18px;border-top:1px solid #e5e7eb;line-height:1.6">Thanks,<br><strong>The CeyHallo Team</strong></div></div></div></div>`;
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]!);
  }

  private dateInputValue(date: Date): string { return date.toISOString().slice(0, 10); }
}
