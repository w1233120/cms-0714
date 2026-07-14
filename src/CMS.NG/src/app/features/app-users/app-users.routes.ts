import { Routes } from '@angular/router';

export const APP_USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./app-user-list/app-user-list').then((m) => m.AppUserList)
  },
  {
    path: 'new',
    loadComponent: () => import('./app-user-form/app-user-form').then((m) => m.AppUserForm)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./app-user-form/app-user-form').then((m) => m.AppUserForm)
  },
  {
    path: ':id',
    loadComponent: () => import('./app-user-detail/app-user-detail').then((m) => m.AppUserDetail)
  }
];
