import { Routes } from '@angular/router';

export const PUBLISH_STATUS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./publish-status-list/publish-status-list').then((m) => m.PublishStatusList)
  },
  {
    path: 'new',
    loadComponent: () => import('./publish-status-form/publish-status-form').then((m) => m.PublishStatusForm)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./publish-status-form/publish-status-form').then((m) => m.PublishStatusForm)
  },
  {
    path: ':id',
    loadComponent: () => import('./publish-status-detail/publish-status-detail').then((m) => m.PublishStatusDetail)
  }
];
