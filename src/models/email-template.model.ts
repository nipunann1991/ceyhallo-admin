export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface EmailQueueItem {
  id: string;
  templateId?: string;
  subject?: string;
  htmlContent?: string;
  channel?: string;
  provider?: string;
  createdAt: string;
  sentAt?: string | { _seconds: number; _nanoseconds?: number };
  failedAt?: string | { _seconds: number; _nanoseconds?: number };
  status: 'pending' | 'sending' | 'sent' | 'failed' | string;
  error?: string;
  email?: string;
  to?: string;
  target?: {
    audience?: string;
    testEmail?: string;
    template?: string;
  };
}
