import { createFeatureSelector, createSelector } from '@ngrx/store';
import { businessAdminFeatureKey } from './business-admin.reducer';
import { BusinessAdminState } from './business-admin.state';

export const selectBusinessAdminState = createFeatureSelector<BusinessAdminState>(businessAdminFeatureKey);

export const selectBusinessSearchQuery = createSelector(selectBusinessAdminState, (state) => state.searchQuery);
export const selectBusinessCategoryFilter = createSelector(selectBusinessAdminState, (state) => state.selectedCategory);
export const selectBusinessTypeFilter = createSelector(selectBusinessAdminState, (state) => state.typeFilter);
export const selectBusinessPriceFilter = createSelector(selectBusinessAdminState, (state) => state.priceFilter);
export const selectBusinessSortBy = createSelector(selectBusinessAdminState, (state) => state.sortBy);
export const selectBusinessCurrentPage = createSelector(selectBusinessAdminState, (state) => state.currentPage);
export const selectBusinessIsFeaturedFilter = createSelector(selectBusinessAdminState, (state) => state.isFeaturedFilter);
export const selectBusinessIsVerifiedFilter = createSelector(selectBusinessAdminState, (state) => state.isVerifiedFilter);
export const selectBusinessIsPremiumFilter = createSelector(selectBusinessAdminState, (state) => state.isPremiumFilter);
