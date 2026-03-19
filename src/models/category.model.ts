export interface Category {
  id: string;
  label: string;
  icon: string;
  tab: string;
  order: number;
  hasNotification: boolean;
  isActive?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
}