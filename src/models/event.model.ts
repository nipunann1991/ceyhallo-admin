
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
  organizerType?: 'restaurant' | 'grocery' | 'business' | 'organization' | 'custom';

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
  actionType?: 'external' | 'whatsapp' | 'call' | 'none';
  actionTarget?: string;
  isArchived?: boolean;
}
