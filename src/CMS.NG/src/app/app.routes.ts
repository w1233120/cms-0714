import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login)
  },
  { path: '', redirectTo: 'app-roles', pathMatch: 'full' },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile)
  },
  {
    path: 'app-users',
    canActivate: [authGuard],
    loadChildren: () => import('./features/app-users/app-users.routes').then((m) => m.APP_USER_ROUTES)
  },
  {
    path: 'app-roles',
    canActivate: [authGuard],
    loadChildren: () => import('./features/app-roles/app-roles.routes').then((m) => m.APP_ROLE_ROUTES)
  },
  {
    path: 'publish-statuses',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/publish-statuses/publish-statuses.routes').then((m) => m.PUBLISH_STATUS_ROUTES)
  },
  {
    path: 'partners',
    canActivate: [authGuard],
    loadChildren: () => import('./features/partners/partners.routes').then((m) => m.PARTNER_ROUTES)
  },
  {
    path: 'course-groups',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/course-groups/course-groups.routes').then((m) => m.COURSE_GROUP_ROUTES)
  },
  {
    path: 'featured-promo-items',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/featured-promo-items/featured-promo-items.routes').then(
        (m) => m.FEATURED_PROMO_ITEM_ROUTES
      )
  },
  {
    path: 'courses',
    canActivate: [authGuard],
    loadChildren: () => import('./features/courses/courses.routes').then((m) => m.COURSE_ROUTES)
  }
];
