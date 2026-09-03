export type PricingType = 'one_time' | 'subscription';
export type BillingPeriod = 'one_time' | 'monthly' | 'quarterly' | 'yearly';

export interface PricingItem {
  id: string;
  name: string;
  description: string;
  type: PricingType;
  billingPeriod: BillingPeriod;
  price: number;
  currency: string;
  isActive: boolean;
  yearlyPrice?: number | null;
  priceMode?: 'fixed' | 'from';
  billingLabel?: string;
}

export interface PricingWorkbookSheet {
  name: string;
  rows: { cells: (string | number | boolean)[] }[];
}

export interface PricingSettings {
  id?: string;
  items: PricingItem[];
  updatedAt?: string;
  referenceSheets?: PricingWorkbookSheet[];
  sourceFile?: string;
}
