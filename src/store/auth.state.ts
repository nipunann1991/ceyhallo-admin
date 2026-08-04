import { User } from '../models/user.model';

export interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  currentUser: null,
  isLoading: true,
  error: null
};
