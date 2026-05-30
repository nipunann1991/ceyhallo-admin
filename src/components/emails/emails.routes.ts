import { Routes } from '@angular/router';

export const emailsRoutes: Routes = [
  { path: '', loadComponent: () => import('./emails.component').then(m => m.EmailsComponent) },
  { path: 'new', loadComponent: () => import('./email-editor/email-editor.component').then(m => m.EmailEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./email-editor/email-editor.component').then(m => m.EmailEditorComponent) }
];
