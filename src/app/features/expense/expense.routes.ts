import { Routes } from '@angular/router';

export const expenseRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/expense-list/expense-list.component').then((m) => m.ExpenseListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/expense-form/expense-form.component').then((m) => m.ExpenseFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/expense-form/expense-form.component').then((m) => m.ExpenseFormComponent),
  },
];
