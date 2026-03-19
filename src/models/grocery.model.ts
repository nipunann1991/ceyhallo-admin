
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
