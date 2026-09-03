import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PricingItem, PricingSettings, PricingWorkbookSheet } from '../../../models/pricing.model';
import { BUSINESS_PLAN_SHEETS } from '../../../data/business-plan';
import { mergePricingItems, parsePricingWorkbook, pricingValidationError } from '../../../utils/pricing';
import { AuthService } from '../../../services/auth.service';
import { FirebaseService } from '../../../services/firebase.service';
import { ModalComponent } from '../../ui/modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: './pricing.component.html'
})
export class PricingComponent implements OnInit {
  private readonly firebaseService = inject(FirebaseService);
  readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  readonly items = signal<PricingItem[]>([]);
  readonly referenceSheets = signal<PricingWorkbookSheet[]>([]);
  readonly sourceFile = signal('');
  readonly isSaving = signal(false);
  readonly isLoading = signal(true);
  readonly isImporting = signal(false);
  readonly loadError = signal('');
  readonly dirty = signal(false);
  readonly editorItem = signal<PricingItem | null>(null);
  readonly isNewItem = signal(false);
  readonly deleteItem = signal<PricingItem | null>(null);
  readonly searchQuery = signal('');
  readonly activeTab = signal<'plans' | 'campaigns' | 'reference'>('plans');
  readonly selectedSheet = signal('');
  readonly plans = computed(() => this.items().filter(item => item.type === 'subscription' || item.billingLabel === 'Free'));
  readonly campaigns = computed(() => this.items().filter(item => item.type === 'one_time' && item.billingLabel !== 'Free'));
  readonly visibleItems = computed(() => {
    const items = this.activeTab() === 'plans' ? this.plans() : this.campaigns();
    const query = this.searchQuery().trim().toLowerCase();
    return items.filter(item => !query || `${item.name} ${item.description}`.toLowerCase().includes(query));
  });
  readonly currentSheet = computed(() => this.referenceSheets().find(sheet => sheet.name === this.selectedSheet()));
  readonly busy = computed(() => this.isLoading() || this.isSaving() || this.isImporting() || !!this.loadError());
  readonly canEdit = computed(() => !this.busy() && this.authService.isAdmin());

  editItem(item: PricingItem): void {
    if (!this.canEdit()) return;
    this.isNewItem.set(false);
    this.editorItem.set(structuredClone(item));
  }

  closeEditor(): void {
    if (!this.isSaving()) this.editorItem.set(null);
  }

  async saveItem(): Promise<void> {
    const item = this.editorItem();
    if (!item || !this.canEdit()) return;
    const error = pricingValidationError([item]);
    if (error) { this.toastService.error(error); return; }
    const next = this.isNewItem() ? [...this.items(), item] : this.items().map(current => current.id === item.id ? item : current);
    if (this.dirty()) {
      this.items.set(next);
      this.editorItem.set(null);
      this.toastService.success('Item updated in the draft. Save Pricing to publish the imported plan.');
    } else if (await this.persist(next)) {
      this.editorItem.set(null);
    }
  }

  async ngOnInit(): Promise<void> { await this.load(); }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const settings: PricingSettings | null = await this.firebaseService.getDocument('settings', 'pricing_subscriptions');
      if (settings) {
        this.items.set(settings.items ?? []);
        this.referenceSheets.set(settings.referenceSheets ?? []);
        this.sourceFile.set(settings.sourceFile ?? '');
        this.dirty.set(false);
      } else {
        this.items.set(parsePricingWorkbook(BUSINESS_PLAN_SHEETS));
        this.referenceSheets.set(BUSINESS_PLAN_SHEETS);
        this.sourceFile.set('CeyHallo_Full_Business_Plan_Pricing.xlsx');
        this.dirty.set(true);
      }
      this.selectedSheet.set(this.referenceSheets()[0]?.name ?? '');
    } catch {
      this.loadError.set('Could not load saved pricing. Retry before making changes.');
    } finally { this.isLoading.set(false); }
  }

  loadBusinessPlan(): void {
    if (!this.canEdit()) return;
    this.applyWorkbook(BUSINESS_PLAN_SHEETS, 'CeyHallo_Full_Business_Plan_Pricing.xlsx');
  }

  private applyWorkbook(sheets: PricingWorkbookSheet[], filename: string): void {
    const imported = parsePricingWorkbook(sheets);
    this.items.set(mergePricingItems(this.items(), imported));
    this.referenceSheets.set(sheets);
    this.sourceFile.set(filename);
    this.selectedSheet.set(sheets[0]?.name ?? '');
    this.dirty.set(true);
    this.toastService.success(`${imported.length} products loaded into your draft. Review and save pricing to apply.`);
  }

  async importWorkbook(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canEdit()) return;
    this.isImporting.set(true);
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error('Choose an .xlsx workbook smaller than 5 MB.');
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheets = workbook.SheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        if (range.e.r > 999 || range.e.c > 29) throw new Error('Each sheet must fit within 1,000 rows and 30 columns.');
        return { name, rows: XLSX.utils.sheet_to_json<(string | number | boolean)[]>(sheet, { header: 1, defval: '', raw: true }).map(cells => ({ cells })) };
      });
      if (new TextEncoder().encode(JSON.stringify(sheets)).length > 500_000) throw new Error('The workbook contains too much data. Keep the pricing and business-plan tables only.');
      this.applyWorkbook(sheets, file.name);
    } catch (error) {
      this.toastService.error(error instanceof Error ? error.message : 'Unable to import this workbook.');
    } finally {
      input.value = '';
      this.isImporting.set(false);
    }
  }

  addItem(type: 'one_time' | 'subscription'): void {
    if (!this.canEdit()) return;
    this.isNewItem.set(true);
    this.editorItem.set({
      id: crypto.randomUUID(), name: '', description: '', type,
      billingPeriod: type === 'subscription' ? 'monthly' : 'one_time',
      price: 0, yearlyPrice: null, priceMode: 'fixed', billingLabel: '', currency: 'AED', isActive: true
    });
  }

  updateDraft(field: keyof PricingItem, value: unknown): void {
    if (!this.canEdit()) return;
    this.editorItem.update(item => {
      if (!item) return null;
      let next = value;
      if (field === 'price' || field === 'yearlyPrice') next = value === '' || value == null ? (field === 'yearlyPrice' ? null : NaN) : Number(value);
      if (field === 'currency') next = String(value).trim().toUpperCase();
      const updated = { ...item, [field]: next } as PricingItem;
      if (field === 'type') {
        updated.billingPeriod = value === 'subscription' ? 'monthly' : 'one_time';
        updated.billingLabel = '';
      }
      if (updated.type !== 'subscription' || updated.billingPeriod !== 'monthly') updated.yearlyPrice = null;
      return updated;
    });
  }

  async confirmDelete(): Promise<void> {
    const item = this.deleteItem();
    if (!item || !this.canEdit()) return;
    const next = this.items().filter(current => current.id !== item.id);
    if (this.dirty()) {
      this.items.set(next);
      this.deleteItem.set(null);
    } else if (await this.persist(next)) {
      this.deleteItem.set(null);
    }
  }

  async save(): Promise<void> {
    if (this.canEdit()) await this.persist(this.items());
  }

  private async persist(items: PricingItem[]): Promise<boolean> {
    if (!this.canEdit()) return false;
    const error = pricingValidationError(items);
    if (error) { this.toastService.error(error); return false; }
    const settings: PricingSettings = { items, referenceSheets: this.referenceSheets(), sourceFile: this.sourceFile(), updatedAt: new Date().toISOString() };
    if (new TextEncoder().encode(JSON.stringify(settings)).length > 700_000) {
      this.toastService.error('The pricing data is too large to save. Use a smaller workbook.'); return false;
    }
    this.isSaving.set(true);
    try {
      await this.firebaseService.set('settings/pricing_subscriptions', settings);
      this.items.set(items);
      this.dirty.set(false);
      this.toastService.success('Pricing saved.');
      return true;
    } catch (error) {
      this.toastService.error('Save failed: ' + (error instanceof Error ? error.message : 'Please try again.'));
      return false;
    } finally { this.isSaving.set(false); }
  }
}
