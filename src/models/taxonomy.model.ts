export interface TaxonomyItem {
  id: string;
  name: string;
  isActive?: boolean;
  isExcluded?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  order?: number;
  createdAt?: string;
}