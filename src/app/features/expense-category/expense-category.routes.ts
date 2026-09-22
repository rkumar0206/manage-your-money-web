import { Routes } from '@angular/router';

export const expenseCategoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/category-list/category-list.component').then((m) => m.CategoryListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/category-form/category-form.component').then((m) => m.CategoryFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/category-form/category-form.component').then((m) => m.CategoryFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/category-detail/category-detail.component').then(
        (m) => m.CategoryDetailComponent,
      ),
  },
];
