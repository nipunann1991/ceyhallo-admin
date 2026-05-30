
import { ActionType } from '../enums/content.enums';
import { BusinessContact, OpeningHour } from './common.model';

export interface Grocery {
  id: string;
  title: string;
  description: string;
  category: string; // Equiv to Cuisine
  location: string;
  imageUrl: string;
  logoUrl?: string;
  rating: number;
  reviews: number;
  countryCode: string;
  cityCode: string;
  isPremium: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  isPublished?: boolean;
  deliveryAvailable: boolean;
  priceRange: string;
  tags: string[];
  gallery: string[];
  menuUrl?: string; // Catalog/Flyer
  openingHours?: OpeningHour[];

  contact?: Partial<BusinessContact>;

  // Booking & Action
  actionType?: ActionType;
  actionTarget?: string;
  isArchived?: boolean;
}
