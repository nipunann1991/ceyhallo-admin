import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BusinessStateService {
  selectedCategory = signal<string | null>(null);
  searchQuery = signal<string>('');
  typeFilter = signal<string>('all');
  priceFilter = signal<string>('all');
  sortBy = signal<string>('newest');
  currentPage = signal<number>(1);

  // Status filters
  isFeaturedFilter = signal<boolean>(false);
  isVerifiedFilter = signal<boolean>(false);
  isPremiumFilter = signal<boolean>(false);
}
