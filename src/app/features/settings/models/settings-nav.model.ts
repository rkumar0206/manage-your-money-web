export interface SettingsSection {
  id: string;
  label: string;
  description: string;
  /** Path fragment relative to `/settings`. */
  route: string;
  /** SVG path data for the section icon. */
  iconPath: string;
  /** Toggle off to hide from nav while the section is still being built. */
  available: boolean;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    id: 'data',
    label: 'Data & backup',
    description: 'Export or restore your account data.',
    route: 'data',
    available: true,
    iconPath:
      'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
  },
  // -------- placeholder entries, flip `available: true` when built --------
  // {
  //   id: 'profile',
  //   label: 'Profile',
  //   description: 'Your name, username and email.',
  //   route: 'profile',
  //   available: false,
  //   iconPath: '...',
  // },
  // {
  //   id: 'preferences',
  //   label: 'Preferences',
  //   description: 'Currency, theme and defaults.',
  //   route: 'preferences',
  //   available: false,
  //   iconPath: '...',
  // },
  // {
  //   id: 'notifications',
  //   label: 'Notifications',
  //   description: 'Digests and reminders.',
  //   route: 'notifications',
  //   available: false,
  //   iconPath: '...',
  // },
  // {
  //   id: 'security',
  //   label: 'Security',
  //   description: 'Password and active sessions.',
  //   route: 'security',
  //   available: false,
  //   iconPath: '...',
  // },
  // {
  //   id: 'about',
  //   label: 'About',
  //   description: 'Version, terms and support.',
  //   route: 'about',
  //   available: false,
  //   iconPath: '...',
  // },
];

export const DEFAULT_SETTINGS_ROUTE = 'data';
