
export interface BusinessLocation {
  isPrimary?: boolean;
  location: string;
  googlePlaceId?: string;
  rating: number;
  reviews: number;
  countryCode: string;
  cityCode: string;
  phones?: string[];
  openingHours?: { day: string; hours: string }[];
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
  openingHours: { day: string; hours: string }[];
  deliveryInfo?: { location: string; charge: string }[];
  
  contact: {
    phones: string[];
    website: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  
  createdDate?: string;
  publishedDate?: string;

  // Booking & Action
  actionType?: 'whatsapp' | 'call' | 'none';
  actionTarget?: string;
  isArchived?: boolean;
  order?: number;
}
