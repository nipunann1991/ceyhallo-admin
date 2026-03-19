
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
  
  contact: {
    phones: string[];
    website: string;
    email?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  
  createdDate?: string;
  publishedDate?: string;

  // Booking & Action
  actionType?: 'whatsapp' | 'call' | 'email' | 'none';
  actionTarget?: string;
}
