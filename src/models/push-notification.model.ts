export interface PushNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetType: 'topic' | 'token';
  targetValue: string; // e.g., 'general' for all users, or specific FCM token
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  error?: string;
  data?: any; // Custom JSON data to send with notification
}