import { Routes } from '@angular/router';

export const notificationsRoutes: Routes = [
  { path: '', loadComponent: () => import('./push-notifications/push-notifications.component').then(m => m.PushNotificationsComponent) },
  { path: 'send', loadComponent: () => import('./push-notification-sender/push-notification-sender.component').then(m => m.PushNotificationSenderComponent) }
];
