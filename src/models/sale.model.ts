import { BillingType, MonetizationTargetModule, TransactionStatus } from '../enums/commerce.enums';

export interface MonetizationProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  billingType: BillingType;
  targetModule: MonetizationTargetModule;
  features: string[];
}

export interface Transaction {
  id: string;
  customerName: string;
  productName: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  paymentMethod: string;
}
