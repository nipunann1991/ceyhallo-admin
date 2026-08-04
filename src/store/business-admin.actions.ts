import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { BusinessAdminState } from './business-admin.state';

export const BusinessAdminActions = createActionGroup({
  source: 'Business Admin',
  events: {
    'Update Filters': props<{ filters: Partial<BusinessAdminState> }>(),
    'Clear Filters': emptyProps()
  }
});
