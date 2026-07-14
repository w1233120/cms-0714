import { Routes } from '@angular/router';

export const COURSE_GROUP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./course-group-list/course-group-list').then((m) => m.CourseGroupList)
  },
  {
    path: 'new',
    loadComponent: () => import('./course-group-form/course-group-form').then((m) => m.CourseGroupForm)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./course-group-form/course-group-form').then((m) => m.CourseGroupForm)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./course-group-detail/course-group-detail').then((m) => m.CourseGroupDetail)
  }
];
