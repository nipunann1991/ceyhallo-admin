import { Routes } from '@angular/router';

export const jobsRoutes: Routes = [
  { path: '', loadComponent: () => import('./jobs.component').then(m => m.JobsComponent) },
  { path: 'new', loadComponent: () => import('./job-editor/job-editor.component').then(m => m.JobEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./job-editor/job-editor.component').then(m => m.JobEditorComponent) },
  { path: ':id', loadComponent: () => import('./job-detail/job-detail.component').then(m => m.JobDetailComponent) }
];
