export interface MonetizationProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  billingType: 'one-time' | 'monthly' | 'weekly';
  targetModule: 'restaurants' | 'businesses' | 'events' | 'jobs' | 'general';
  features: string[];
}

export interface Transaction {
  id: string;
  customerName: string;
  productName: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
}