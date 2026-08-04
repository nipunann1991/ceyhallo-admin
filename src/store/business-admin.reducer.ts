import { createReducer, on } from '@ngrx/store';
import { BusinessAdminActions } from './business-admin.actions';
import { BusinessAdminState, initialBusinessAdminState } from './business-admin.state';

export const businessAdminFeatureKey = 'businessAdmin';

export const businessAdminReducer = createReducer<BusinessAdminState>(
  initialBusinessAdminState,
  on(BusinessAdminActions.updateFilters, (state, { filters }) => ({
    ...state,
    ...filters
  })),
  on(BusinessAdminActions.clearFilters, () => initialBusinessAdminState)
);
