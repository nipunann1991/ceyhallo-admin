import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  { path: '', redirectTo: 'home-page', pathMatch: 'full' },
  { path: 'app-config', loadComponent: () => import('./app-config/app-config.component').then(m => m.AppConfigComponent) },
  { path: 'home-page', loadComponent: () => import('./home-sections/home-sections.component').then(m => m.HomeSectionsComponent) },
  { path: 'locations', loadComponent: () => import('./locations/locations.component').then(m => m.LocationsComponent) },
  { path: 'categories', loadComponent: () => import('./categories/categories.component').then(m => m.CategoriesComponent) },
  { path: 'business-categories', loadComponent: () => import('./business-categories/business-categories.component').then(m => m.BusinessCategoriesComponent) },
  { path: 'news-categories', loadComponent: () => import('./news-categories/news-categories.component').then(m => m.NewsCategoriesComponent) },
  { path: 'hub-info', loadComponent: () => import('../hub/hub.component').then(m => m.HubComponent) },
  { path: 'emailing', loadComponent: () => import('./email-config/email-config.component').then(m => m.EmailConfigComponent) },
  { path: 'terms', loadComponent: () => import('./legal/legal.component').then(m => m.LegalComponent), data: { docId: 'terms', title: 'Terms & Conditions' } },
  { path: 'privacy', loadComponent: () => import('./legal/legal.component').then(m => m.LegalComponent), data: { docId: 'privacy', title: 'Privacy Policy' } },
  { path: 'help', loadComponent: () => import('./legal/legal.component').then(m => m.LegalComponent), data: { docId: 'help', title: 'Help & Support' } }
];
