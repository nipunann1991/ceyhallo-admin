import { PricingItem, PricingWorkbookSheet } from '../models/pricing.model';

const text = (value: unknown) => String(value ?? '').trim();
const price = (value: unknown): number => {
  if ((typeof value !== 'number' && typeof value !== 'string') || text(value) === '' || !Number.isFinite(Number(value)) || Number(value) < 0) {
    throw new Error('Every pricing row must contain a valid, non-negative AED price.');
  }
  return Number(value);
};

/** The Pricing sheet is the price authority; the other sheets remain reference data. */
export function parsePricingWorkbook(sheets: PricingWorkbookSheet[]): PricingItem[] {
  const rows = sheets.find(sheet => sheet.name.toLowerCase() === 'pricing')?.rows.map(row => row.cells);
  if (!rows) throw new Error('The workbook must include a Pricing sheet.');
  const plansHeader = rows.findIndex(row => text(row[0]) === 'Product' && text(row[1]) === 'Monthly Price (AED)' && text(row[2]) === 'Yearly Price (AED)');
  const campaignsHeader = rows.findIndex(row => text(row[0]) === 'Campaign / Add-on' && text(row[1]) === 'Price' && text(row[2]) === 'Billing');
  if (plansHeader < 0 || campaignsHeader <= plansHeader) throw new Error('Use the business-plan workbook format with Product and Campaign / Add-on tables.');
  const items: PricingItem[] = [];
  const add = (row: (string | number | boolean)[], subscription: boolean) => {
    const name = text(row[0]);
    if (!name) return;
    const id = `business-plan-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    if (items.some(item => item.id === id)) throw new Error(`Duplicate product: ${name}`);
    const monthly = price(row[1]);
    const yearly = subscription ? price(row[2]) : null;
    const free = subscription && monthly === 0 && yearly === 0;
    items.push({
      id, name, description: text(row[subscription ? 5 : 3]),
      type: subscription && !free ? 'subscription' : 'one_time',
      billingPeriod: subscription && !free ? 'monthly' : 'one_time',
      price: monthly, yearlyPrice: free ? null : yearly,
      currency: 'AED', isActive: true,
      priceMode: !subscription && /^from\b/i.test(text(row[2])) ? 'from' : 'fixed',
      billingLabel: free ? 'Free' : subscription ? '' : text(row[2])
    });
  };
  rows.slice(plansHeader + 1, campaignsHeader).filter(row => text(row[0])).forEach(row => add(row, true));
  rows.slice(campaignsHeader + 1).filter(row => text(row[0])).forEach(row => add(row, false));
  if (!items.length) throw new Error('No pricing rows were found.');
  return items;
}

/** Preserve custom products and existing identifiers when reimporting the workbook. */
export function mergePricingItems(existing: PricingItem[], imported: PricingItem[]): PricingItem[] {
  const result = existing.map(item => ({ ...item }));
  for (const item of imported) {
    const index = result.findIndex(current => current.id === item.id || current.name.trim().toLowerCase() === item.name.toLowerCase());
    if (index < 0) result.push(item);
    else result[index] = { ...result[index], ...item, id: result[index].id, isActive: result[index].isActive };
  }
  return result;
}

export function invoicePricingOptions(items: PricingItem[]): PricingItem[] {
  return items.filter(item => item.isActive).flatMap(item => {
    if (item.type !== 'subscription') return [item];
    const primary = { ...item, name: `${item.name} · ${item.billingPeriod}` };
    if (item.billingPeriod !== 'monthly' || item.yearlyPrice == null) return [primary];
    return [primary, { ...item, id: `${item.id}:yearly`, name: `${item.name} · yearly`, billingPeriod: 'yearly' as const, price: item.yearlyPrice }];
  });
}

export function pricingValidationError(items: PricingItem[]): string | null {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id)) return 'Each pricing item must have a unique ID.';
    ids.add(item.id);
    if (!item.name.trim() || !Number.isFinite(item.price) || item.price < 0) return 'Each item needs a name and a valid, non-negative price.';
    if (!/^[A-Z]{3}$/.test(item.currency)) return 'Use a three-letter currency code, such as AED.';
    if (item.type === 'subscription' ? !['monthly', 'quarterly', 'yearly'].includes(item.billingPeriod) : item.type !== 'one_time' || item.billingPeriod !== 'one_time') return 'Choose a valid billing period for each item.';
    if (item.yearlyPrice != null && (item.type !== 'subscription' || item.billingPeriod !== 'monthly' || !Number.isFinite(item.yearlyPrice) || item.yearlyPrice < 0)) return 'Annual options need a monthly subscription and a valid yearly price.';
  }
  return null;
}
