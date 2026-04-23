

import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation, Routes } from '@angular/router';
import { AppComponent } from './src/app.component';
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./src/components/login/login.component').then(m => m.LoginComponent) },
  { path: 'no-access', loadComponent: () => import('./src/components/no-access/no-access.component').then(m => m.NoAccessComponent) },
  { path: 'dashboard', loadComponent: () => import('./src/components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  
  // Businesses
  { path: 'businesses', loadComponent: () => import('./src/components/businesses/businesses.component').then(m => m.BusinessesComponent) },
  { path: 'businesses/new', loadComponent: () => import('./src/components/businesses/business-editor.component').then(m => m.BusinessEditorComponent) },
  { path: 'businesses/edit/:id', loadComponent: () => import('./src/components/businesses/business-editor.component').then(m => m.BusinessEditorComponent) },
  { path: 'businesses/:id', loadComponent: () => import('./src/components/businesses/business-detail.component').then(m => m.BusinessDetailComponent) },

  // Hub
  { path: 'hub', redirectTo: 'settings/hub-info', pathMatch: 'full' },

  // Jobs
  { path: 'jobs', loadComponent: () => import('./src/components/jobs/jobs.component').then(m => m.JobsComponent) },
  { path: 'jobs/new', loadComponent: () => import('./src/components/jobs/job-editor.component').then(m => m.JobEditorComponent) },
  { path: 'jobs/edit/:id', loadComponent: () => import('./src/components/jobs/job-editor.component').then(m => m.JobEditorComponent) },
  { path: 'jobs/:id', loadComponent: () => import('./src/components/jobs/job-detail.component').then(m => m.JobDetailComponent) },

  // Banners
  { path: 'banners', loadComponent: () => import('./src/components/banners/banners.component').then(m => m.BannersComponent) },
  { path: 'banners/new', loadComponent: () => import('./src/components/banners/banner-editor.component').then(m => m.BannerEditorComponent) },
  { path: 'banners/edit/:id', loadComponent: () => import('./src/components/banners/banner-editor.component').then(m => m.BannerEditorComponent) },
  { path: 'banners/:id', loadComponent: () => import('./src/components/banners/banner-detail.component').then(m => m.BannerDetailComponent) },

  // Offers
  { path: 'offers', loadComponent: () => import('./src/components/offers/offers.component').then(m => m.OffersComponent) },
  { path: 'offers/new', loadComponent: () => import('./src/components/offers/offer-editor.component').then(m => m.OfferEditorComponent) },
  { path: 'offers/edit/:id', loadComponent: () => import('./src/components/offers/offer-editor.component').then(m => m.OfferEditorComponent) },
  { path: 'offers/:id', loadComponent: () => import('./src/components/offers/offer-detail.component').then(m => m.OfferDetailComponent) },

  // Events
  { path: 'events', loadComponent: () => import('./src/components/events/events.component').then(m => m.EventsComponent) },
  { path: 'events/new', loadComponent: () => import('./src/components/events/event-editor.component').then(m => m.EventEditorComponent) },
  { path: 'events/edit/:id', loadComponent: () => import('./src/components/events/event-editor.component').then(m => m.EventEditorComponent) },
  { path: 'events/:id', loadComponent: () => import('./src/components/events/event-detail.component').then(m => m.EventDetailComponent) },

  // News
  { path: 'news', loadComponent: () => import('./src/components/news/news.component').then(m => m.NewsComponent) },
  { path: 'news/rss-import', loadComponent: () => import('./src/components/news/rss-import.route.js').then(m => m.NewsRssImportComponent) },
  { path: 'news/new', loadComponent: () => import('./src/components/news/news-editor.component').then(m => m.NewsEditorComponent) },
  { path: 'news/edit/:id', loadComponent: () => import('./src/components/news/news-editor.component').then(m => m.NewsEditorComponent) },
  { path: 'news/:id', loadComponent: () => import('./src/components/news/news-detail.component').then(m => m.NewsDetailComponent) },
  
  // Push Notifications
  { path: 'notifications', loadComponent: () => import('./src/components/notifications/push-notifications.component').then(m => m.PushNotificationsComponent) },
  { path: 'notifications/send', loadComponent: () => import('./src/components/notifications/push-notification-sender.component').then(m => m.PushNotificationSenderComponent) },

  // Emails
  { path: 'emails', loadComponent: () => import('./src/components/emails/emails.component').then(m => m.EmailsComponent) },
  { path: 'emails/new', loadComponent: () => import('./src/components/emails/email-editor.component').then(m => m.EmailEditorComponent) },
  { path: 'emails/edit/:id', loadComponent: () => import('./src/components/emails/email-editor.component').then(m => m.EmailEditorComponent) },

  // Media
  { path: 'media', loadComponent: () => import('./src/components/media/media.component').then(m => m.MediaComponent) },

  { path: 'users', loadComponent: () => import('./src/components/users/users.component').then(m => m.UsersComponent) },
  { 
    path: 'settings', 
    loadComponent: () => import('./src/components/settings/settings.component').then(m => m.SettingsComponent),
    children: [
      { path: '', redirectTo: 'app-config', pathMatch: 'full' },
      { path: 'app-config', loadComponent: () => import('./src/components/settings/app-config/app-config.component').then(m => m.AppConfigComponent) },
      { path: 'home-page', loadComponent: () => import('./src/components/settings/home-sections/home-sections.component').then(m => m.HomeSectionsComponent) },
      { path: 'locations', loadComponent: () => import('./src/components/settings/locations/locations.component').then(m => m.LocationsComponent) },
      { path: 'categories', loadComponent: () => import('./src/components/settings/categories/categories.component').then(m => m.CategoriesComponent) },
      { path: 'business-categories', loadComponent: () => import('./src/components/settings/business-categories/business-categories.component').then(m => m.BusinessCategoriesComponent) },
      { path: 'news-categories', loadComponent: () => import('./src/components/settings/news-categories/news-categories.component').then(m => m.NewsCategoriesComponent) },
      { path: 'hub-info', loadComponent: () => import('./src/components/hub/hub.component').then(m => m.HubComponent) },
      { path: 'emailing', loadComponent: () => import('./src/components/settings/email/email-config.component').then(m => m.EmailConfigComponent) },
      { path: 'terms', loadComponent: () => import('./src/components/settings/legal/legal.component').then(m => m.LegalComponent), data: { docId: 'terms', title: 'Terms & Conditions' } },
      { path: 'privacy', loadComponent: () => import('./src/components/settings/legal/legal.component').then(m => m.LegalComponent), data: { docId: 'privacy', title: 'Privacy Policy' } },
      { path: 'help', loadComponent: () => import('./src/components/settings/legal/legal.component').then(m => m.LegalComponent), data: { docId: 'help', title: 'Help & Support' } }
    ]
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation())
  ]
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
