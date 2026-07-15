import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'app-roles', pathMatch: 'full' },
  {
    path: 'app-users',
    loadChildren: () => import('./features/app-users/app-users.routes').then((m) => m.APP_USER_ROUTES)
  },
  {
    path: 'app-roles',
    loadChildren: () => import('./features/app-roles/app-roles.routes').then((m) => m.APP_ROLE_ROUTES)
  },
  {
    path: 'publish-statuses',
    loadChildren: () =>
      import('./features/publish-statuses/publish-statuses.routes').then((m) => m.PUBLISH_STATUS_ROUTES)
  },
  {
    path: 'partners',
    loadChildren: () => import('./features/partners/partners.routes').then((m) => m.PARTNER_ROUTES)
  },
  {
    path: 'course-groups',
    loadChildren: () =>
      import('./features/course-groups/course-groups.routes').then((m) => m.COURSE_GROUP_ROUTES)
  },
  {
    path: 'featured-promo-items',
    loadChildren: () =>
      import('./features/featured-promo-items/featured-promo-items.routes').then(
        (m) => m.FEATURED_PROMO_ITEM_ROUTES
      )
  },
  {
    path: 'courses',
    loadChildren: () => import('./features/courses/courses.routes').then((m) => m.COURSE_ROUTES)
  }
];
