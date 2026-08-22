
import { ActionType } from '../enums/content.enums';
import { BusinessContact, DeliveryInfo, OpeningHour } from './common.model';

export interface BusinessLocation {
  isPrimary?: boolean;
  location: string;
  mapQuery?: string;
  useBusinessNameForMap?: boolean;
  googlePlaceId?: string;
  rating: number;
  reviews: number;
  countryCode: string;
  cityCode: string;
  phones?: string[];
  openingHours?: OpeningHour[];
}

export interface MenuCatalogItem {
  name: string;
  category?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
}

export interface Business {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId?: string; // Added categoryId for filtering
  type?: string;
  priceRange?: string;
  location: string;
  locations?: BusinessLocation[];
  imageUrl: string;
  logoUrl?: string; // Added logo
  menuUrl?: string; // Added Catalog/Flyer
  menuItems?: MenuCatalogItem[];
  referralCode?: string;
  googlePlaceId?: string;
  rating: number;
  reviews: number;
  countryCode: string;
  cityCode: string;
  isPremium: boolean;
  isVerified: boolean;
  isFeatured?: boolean; // Added isFeatured
  isPublished?: boolean;
  isDeliveryAvailable?: boolean;
  services: string[];
  gallery: string[];
  openingHours: OpeningHour[];
  deliveryInfo?: DeliveryInfo[];

  contact: BusinessContact;
  
  createdDate?: string;
  publishedDate?: string;

  // Booking & Action
  actionType?: ActionType;
  actionTarget?: string;
  isArchived?: boolean;
  alphabeticalSortKey?: string;
  categorySortId?: number;
  featuredSortId?: number;
  order?: number;
}
