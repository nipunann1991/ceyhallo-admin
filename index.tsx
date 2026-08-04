

import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { AppComponent } from './src/app.component';
import { routes } from './src/app.routes';
import { authFeatureKey, authReducer } from './src/store/auth.reducer';
import { businessAdminFeatureKey, businessAdminReducer } from './src/store/business-admin.reducer';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideStore({
      [authFeatureKey]: authReducer,
      [businessAdminFeatureKey]: businessAdminReducer
    })
  ]
}).catch(err => console.error(err));
