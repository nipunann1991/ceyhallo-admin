import { Routes } from '@angular/router';

export const businessesRoutes: Routes = [
  { path: '', loadComponent: () => import('./businesses.component').then(m => m.BusinessesComponent) },
  { path: 'new', loadComponent: () => import('./business-editor/business-editor.component').then(m => m.BusinessEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./business-editor/business-editor.component').then(m => m.BusinessEditorComponent) },
  { path: ':id', loadComponent: () => import('./business-detail/business-detail.component').then(m => m.BusinessDetailComponent) }
];
