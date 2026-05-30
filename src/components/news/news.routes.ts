import { Routes } from '@angular/router';

export const newsRoutes: Routes = [
  { path: '', loadComponent: () => import('./news.component').then(m => m.NewsComponent) },
  { path: 'rss-import', loadComponent: () => import('./rss-import/rss-import.component').then(m => m.NewsRssImportComponent) },
  { path: 'new', loadComponent: () => import('./news-editor/news-editor.component').then(m => m.NewsEditorComponent) },
  { path: 'edit/:id', loadComponent: () => import('./news-editor/news-editor.component').then(m => m.NewsEditorComponent) },
  { path: ':id', loadComponent: () => import('./news-detail/news-detail.component').then(m => m.NewsDetailComponent) }
];
