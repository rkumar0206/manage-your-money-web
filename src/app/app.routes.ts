import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // ---- Public (no shell) ----
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/pages/auth.routes').then((m) => m.authRoutes),
  },

  // ---- Authed (inside shell) ----
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'categories',
        loadChildren: () =>
          import('./features/expense-category/expense-category.routes').then(
            (m) => m.expenseCategoryRoutes,
          ),
      },
      {
        path: 'expenses',
        loadChildren: () =>
          import('./features/expense/expense.routes').then((m) => m.expenseRoutes),
      },
      // Placeholders — swap in real components later
      // { path: 'settings',   loadComponent: () => ... },

      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'data',
        loadComponent: () =>
          import('./features/data-transfer/pages/data-transfer/data-transfer.component').then(
            (m) => m.DataTransferComponent,
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
