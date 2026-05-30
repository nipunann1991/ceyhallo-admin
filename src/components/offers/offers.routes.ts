import { Routes } from '@angular/router';

export const offersRoutes: Routes = [
  { path: '', loadComponent: () => import('./offers.component').then(m => m.OffersComponent) },
  { path: 'new', loadComponent: () => import('./offer-editor/offer-editor.component').then(m => m.OfferEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./offer-editor/offer-editor.component').then(m => m.OfferEditorComponent) },
  { path: ':id', loadComponent: () => import('./offer-detail/offer-detail.component').then(m => m.OfferDetailComponent) }
];
