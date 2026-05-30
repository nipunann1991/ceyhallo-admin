
import { ActionType } from '../enums/content.enums';
import { OrganizationContact } from './common.model';

export interface Organization {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  imageUrl: string;
  logoUrl?: string;
  menuUrl?: string; // Added Catalog/Flyer
  countryCode: string;
  cityCode: string;
  isVerified: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  tags: string[];
  gallery: string[];
  
  contact: OrganizationContact;
  
  createdDate?: string;
  publishedDate?: string;

  // Booking & Action
  actionType?: ActionType;
  actionTarget?: string;
}
