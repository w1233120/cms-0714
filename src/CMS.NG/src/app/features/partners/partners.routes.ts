import { Routes } from '@angular/router';

export const PARTNER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./partner-list/partner-list').then((m) => m.PartnerList)
  },
  {
    path: 'new',
    loadComponent: () => import('./partner-form/partner-form').then((m) => m.PartnerForm)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./partner-form/partner-form').then((m) => m.PartnerForm)
  },
  {
    path: ':id',
    loadComponent: () => import('./partner-detail/partner-detail').then((m) => m.PartnerDetail)
  }
];
