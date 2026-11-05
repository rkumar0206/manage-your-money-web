import { Routes } from '@angular/router';

export const splitwiseRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/split-group-list/split-group-list.component').then(
        (m) => m.SplitGroupListComponent,
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/split-group-form/split-group-form.component').then(
        (m) => m.SplitGroupFormComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/split-group-detail/split-group-detail.component').then(
        (m) => m.SplitGroupDetailComponent,
      ),
  },
];
