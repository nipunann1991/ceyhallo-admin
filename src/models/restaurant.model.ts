
import { ActionType } from '../enums/content.enums';
import { BusinessContact, OpeningHour } from './common.model';

export interface Restaurant {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  location: string;
  imageUrl: string;
  logoUrl?: string; // Added logo
  rating: number;
  reviews: number;
  countryCode: string;
  cityCode: string;
  isPremium: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  isPublished?: boolean;
  priceRange: string;
  tags: string[];
  gallery: string[];
  menuUrl?: string;
  openingHours?: OpeningHour[];

  contact?: Partial<BusinessContact>;

  // Booking & Action
  actionType?: ActionType;
  actionTarget?: string;
  isArchived?: boolean;
}
