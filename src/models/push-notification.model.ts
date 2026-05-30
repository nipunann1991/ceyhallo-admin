import { PushNotificationStatus, PushNotificationTargetType } from '../enums/notification.enums';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetType: PushNotificationTargetType;
  targetValue: string; // e.g., 'general' for all users, or specific FCM token
  status: PushNotificationStatus;
  createdAt: string;
  sentAt?: string;
  scheduledAt?: string;
  error?: string;
  data?: any; // Custom JSON data to send with notification
}
