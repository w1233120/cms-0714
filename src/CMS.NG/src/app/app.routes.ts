import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'app-roles', pathMatch: 'full' },
  {
    path: 'app-roles',
    loadChildren: () => import('./features/app-roles/app-roles.routes').then((m) => m.APP_ROLE_ROUTES)
  }
];
