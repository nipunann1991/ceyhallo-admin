import { Routes } from '@angular/router';

export const eventsRoutes: Routes = [
  { path: '', loadComponent: () => import('./events.component').then(m => m.EventsComponent) },
  { path: 'new', loadComponent: () => import('./event-editor/event-editor.component').then(m => m.EventEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./event-editor/event-editor.component').then(m => m.EventEditorComponent) },
  { path: ':id', loadComponent: () => import('./event-detail/event-detail.component').then(m => m.EventDetailComponent) }
];
