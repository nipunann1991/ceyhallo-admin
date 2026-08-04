import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthState, initialAuthState } from './auth.state';

export const authFeatureKey = 'auth';

export const authReducer = createReducer<AuthState>(
  initialAuthState,
  on(AuthActions.setLoading, (state, { isLoading }) => ({
    ...state,
    isLoading
  })),
  on(AuthActions.setCurrentUser, (state, { user }) => ({
    ...state,
    currentUser: user,
    error: null
  })),
  on(AuthActions.setError, (state, { error }) => ({
    ...state,
    error
  })),
  on(AuthActions.logout, () => ({
    ...initialAuthState,
    isLoading: false
  }))
);
