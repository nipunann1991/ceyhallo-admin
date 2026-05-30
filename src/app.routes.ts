import { Routes } from '@angular/router';
import { bannersRoutes } from './components/banners/banners.routes';
import { businessesRoutes } from './components/businesses/businesses.routes';
import { emailsRoutes } from './components/emails/emails.routes';
import { eventsRoutes } from './components/events/events.routes';
import { jobsRoutes } from './components/jobs/jobs.routes';
import { newsRoutes } from './components/news/news.routes';
import { notificationsRoutes } from './components/notifications/notifications.routes';
import { offersRoutes } from './components/offers/offers.routes';
import { settingsRoutes } from './components/settings/settings.routes';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'no-access', canActivate: [authGuard], loadComponent: () => import('./components/no-access/no-access.component').then(m => m.NoAccessComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'businesses', canActivate: [authGuard], children: businessesRoutes },
  { path: 'hub', redirectTo: 'settings/hub-info', pathMatch: 'full' },
  { path: 'jobs', canActivate: [authGuard], children: jobsRoutes },
  { path: 'banners', canActivate: [authGuard], children: bannersRoutes },
  { path: 'offers', canActivate: [authGuard], children: offersRoutes },
  { path: 'events', canActivate: [authGuard], children: eventsRoutes },
  { path: 'news', canActivate: [authGuard], children: newsRoutes },
  { path: 'notifications', canActivate: [authGuard], children: notificationsRoutes },
  { path: 'emails', canActivate: [authGuard], children: emailsRoutes },
  { path: 'media', canActivate: [authGuard], loadComponent: () => import('./components/media/media.component').then(m => m.MediaComponent) },
  { path: 'users', canActivate: [authGuard], loadComponent: () => import('./components/users/users.component').then(m => m.UsersComponent) },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent),
    children: settingsRoutes
  }
];
