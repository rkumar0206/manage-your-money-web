import { Routes } from '@angular/router';
import { SettingsShellComponent } from './pages/settings-shell/settings-shell.component';
import { DEFAULT_SETTINGS_ROUTE } from './models/settings-nav.model';

export const settingsRoutes: Routes = [
  {
    path: '',
    component: SettingsShellComponent,
    children: [
      {
        path: 'data',
        loadComponent: () =>
          import('./pages/data-settings/data-settings.component').then(
            (m) => m.DataSettingsComponent,
          ),
      },
      // Future sections — one line each:
      // {
      //   path: 'profile',
      //   loadComponent: () =>
      //     import('./pages/profile-settings/profile-settings.component')
      //       .then((m) => m.ProfileSettingsComponent),
      // },

      { path: '', pathMatch: 'full', redirectTo: DEFAULT_SETTINGS_ROUTE },
    ],
  },
];
