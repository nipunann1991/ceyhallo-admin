export interface Offer {
  id: string;
  title: string;
  image: string;
  category?: string; // New field for Offer Category (Business, Food, Other)
  generalCategory?: string;
  categories?: string[];
  description?: string;
  content?: string; // Rich text details
  isActive: boolean;
  order?: number;
  
  // Linking configuration
  linkType: string; // Dynamic tab key from categories, or 'external'/'none'
  targetId?: string; // ID of the entity or URL
  targetName?: string; // Cache the name of the linked entity for display
  offerBy?: string;
  
  // Meta
  publishedDate?: string;
  endDate?: string;
  publishedBy?: string;
  tag?: string; // e.g., "50% OFF"

  // Display Options
  isHomeBanner?: boolean;     // Show on Home Page carousel/list
  isSectionBanner?: boolean;  // Show on relevant section (Restaurant/Business tab)
  isArchived?: boolean;
}
