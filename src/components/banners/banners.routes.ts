import { Routes } from '@angular/router';

export const bannersRoutes: Routes = [
  { path: '', loadComponent: () => import('./banners.component').then(m => m.BannersComponent) },
  { path: 'new', loadComponent: () => import('./banner-editor/banner-editor.component').then(m => m.BannerEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./banner-editor/banner-editor.component').then(m => m.BannerEditorComponent) },
  { path: ':id', loadComponent: () => import('./banner-detail/banner-detail.component').then(m => m.BannerDetailComponent) }
];
