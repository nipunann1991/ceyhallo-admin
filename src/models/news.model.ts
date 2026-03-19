export interface News {
  id: string;
  title: string;
  excerpt: string; // Replaces description
  content: string;
  imageUrl: string;
  author: string;
  publishedDate: string; // Replaces date
  createdDate?: string;
  category: string; // Replaces tags
  isFeatured: boolean;
  isPublished: boolean; // Kept for draft logic
  isNewsPageBanner?: boolean;
  featuredOrder?: number;
  isArchived?: boolean;
}