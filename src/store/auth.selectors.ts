import { createFeatureSelector, createSelector } from '@ngrx/store';
import { authFeatureKey } from './auth.reducer';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectCurrentUser = createSelector(selectAuthState, (state) => state.currentUser);
export const selectAuthIsLoading = createSelector(selectAuthState, (state) => state.isLoading);
export const selectAuthError = createSelector(selectAuthState, (state) => state.error);
