import { Routes } from '@angular/router';

export const APP_ROLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./app-role-list/app-role-list').then((m) => m.AppRoleList)
  },
  {
    path: 'new',
    loadComponent: () => import('./app-role-form/app-role-form').then((m) => m.AppRoleForm)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./app-role-form/app-role-form').then((m) => m.AppRoleForm)
  },
  {
    path: ':id',
    loadComponent: () => import('./app-role-detail/app-role-detail').then((m) => m.AppRoleDetail)
  }
];
