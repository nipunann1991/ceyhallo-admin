
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
  openingHours?: { day: string; hours: string }[];
  
  contact?: {
    phones?: string[];
    website?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };

  // Booking & Action
  actionType?: 'whatsapp' | 'call' | 'none';
  actionTarget?: string;
  isArchived?: boolean;
}
