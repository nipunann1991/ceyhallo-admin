import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User } from '../models/user.model';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Set Loading': props<{ isLoading: boolean }>(),
    'Set Current User': props<{ user: User | null }>(),
    'Set Error': props<{ error: string | null }>(),
    'Logout': emptyProps()
  }
});
