export interface InvoiceLineItem {
  pricingId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId?: string;
  customerName: string;
  customerEmail: string;
  businessAddress?: string;
  issueDate: string;
  dueDate: string;
  paymentTerms?: string;
  currency: string;
  items: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  paymentMethod?: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}
