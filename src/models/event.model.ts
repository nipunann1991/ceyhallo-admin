
import { EventActionType, EventOrganizerType } from '../enums/content.enums';

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  fullDate: string;
  startTime?: string;
  endTime?: string;
  allDayEvent: boolean;
  location: string;
  imageUrl: string;
  
  // Organizer Info
  organizer: string; // Display Name (Snapshot)
  organizerId?: string; // Linked Entity ID
  organizerType?: EventOrganizerType;

  category: string;
  isFeatured: boolean;
  eventBannerOrder?: number;
  countryCode?: string;
  cityCode?: string;
  publishedDate: string;
  createdDate?: string;
  isPublished?: boolean; // Derived or UI state
  gallery?: string[];
  
  // Action / Registration
  actionType?: EventActionType;
  actionTarget?: string;
  isArchived?: boolean;
}
