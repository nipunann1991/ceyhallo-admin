export interface BusinessAdminState {
  selectedCategory: string;
  searchQuery: string;
  typeFilter: string;
  priceFilter: string;
  sortBy: BusinessSortOption;
  currentPage: number;
  isFeaturedFilter: boolean;
  isVerifiedFilter: boolean;
  isPremiumFilter: boolean;
}

export const initialBusinessAdminState: BusinessAdminState = {
  selectedCategory: 'all',
  searchQuery: '',
  typeFilter: 'all',
  priceFilter: 'all',
  sortBy: 'title-asc',
  currentPage: 1,
  isFeaturedFilter: false,
  isVerifiedFilter: false,
  isPremiumFilter: false
};

export type BusinessSortOption =
  | 'title-asc'
  | 'title-desc'
  | 'alphabetical-sort-key'
  | 'category-asc'
  | 'category-desc'
  | 'category-order'
  | 'category-order-desc'
  | 'category-sort-id'
  | 'featured-sort-id'
  | 'phone-asc'
  | 'phone-desc'
  | 'rating-asc'
  | 'rating-desc'
  | 'state-asc'
  | 'state-desc'
  | 'order';
