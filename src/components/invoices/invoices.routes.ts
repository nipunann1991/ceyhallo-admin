import { Routes } from '@angular/router';

export const invoicesRoutes: Routes = [
  { path: '', loadComponent: () => import('./invoices.component').then(m => m.InvoicesComponent) },
  { path: 'new', loadComponent: () => import('./invoice-editor/invoice-editor.component').then(m => m.InvoiceEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./invoice-editor/invoice-editor.component').then(m => m.InvoiceEditorComponent) }
];
