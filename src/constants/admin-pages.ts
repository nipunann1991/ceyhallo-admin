export interface AdminPageOption {
  key: string;
  label: string;
  path: string;
  description: string;
}

export const ADMIN_PAGE_OPTIONS: AdminPageOption[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', description: 'Overview and KPI dashboard' },
  { key: 'users', label: 'Users', path: '/users', description: 'User roles and access management' },
  { key: 'businesses', label: 'Businesses', path: '/businesses', description: 'Business listings and quality controls' },
  { key: 'jobs', label: 'Jobs', path: '/jobs', description: 'Jobs management' },
  { key: 'banners', label: 'Banners', path: '/banners', description: 'Banner campaigns' },
  { key: 'offers', label: 'Offers', path: '/offers', description: 'Offers and promotions' },
  { key: 'events', label: 'Events', path: '/events', description: 'Events management' },
  { key: 'news', label: 'News', path: '/news', description: 'News publishing workflow' },
  { key: 'notifications', label: 'Notifications', path: '/notifications', description: 'Push notifications' },
  { key: 'emails', label: 'Emails', path: '/emails', description: 'Email templates and campaigns' },
  { key: 'media', label: 'Media Library', path: '/media', description: 'Media uploads and assets' },
  { key: 'settings', label: 'Settings', path: '/settings', description: 'App and taxonomy settings' }
];

export const ALL_ADMIN_PAGE_PATHS = ADMIN_PAGE_OPTIONS.map((page) => page.path);
