import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page';

// lazy depuis app.routes path ''
export const LANDING_ROUTES: Routes = [
  {
    path: '',
    component: LandingPageComponent,
  },
];
