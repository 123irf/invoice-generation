// ============================================================
// Permission constants — safe to import from Client Components
// ============================================================

export const ALL_PERMISSIONS = {
  // Dashboard
  'dashboard.view': 'View Dashboard',

  // Clients
  'clients.view': 'View Clients',
  'clients.create': 'Create Clients',
  'clients.edit': 'Edit Clients',
  'clients.delete': 'Delete Clients',

  // Quotes
  'quotes.view': 'View Quotes',
  'quotes.create': 'Create Quotes',
  'quotes.edit': 'Edit Quotes',
  'quotes.delete': 'Delete Quotes',
  'quotes.send': 'Send Quotes (Email)',
  'quotes.convert': 'Convert Quote to Invoice',

  // Invoices
  'invoices.view': 'View Invoices',
  'invoices.create': 'Create Invoices',
  'invoices.edit': 'Edit Invoices',
  'invoices.delete': 'Delete Invoices',
  'invoices.send': 'Send Invoices (Email)',
  'invoices.record_payment': 'Record Payments',

  // Settings
  'settings.view': 'View Settings',
  'settings.edit': 'Edit Settings',
  'settings.users': 'Manage Users',
  'settings.permissions': 'Manage Permissions',
} as const;

export type Permission = keyof typeof ALL_PERMISSIONS;

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Dashboard',
    permissions: ['dashboard.view'],
  },
  {
    label: 'Clients',
    permissions: ['clients.view', 'clients.create', 'clients.edit', 'clients.delete'],
  },
  {
    label: 'Quotes',
    permissions: ['quotes.view', 'quotes.create', 'quotes.edit', 'quotes.delete', 'quotes.send', 'quotes.convert'],
  },
  {
    label: 'Invoices',
    permissions: ['invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.send', 'invoices.record_payment'],
  },
  {
    label: 'Settings',
    permissions: ['settings.view', 'settings.edit', 'settings.users', 'settings.permissions'],
  },
];

export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.keys(ALL_PERMISSIONS) as Permission[],
  ADMIN: [
    'dashboard.view',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.delete', 'quotes.send', 'quotes.convert',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.send', 'invoices.record_payment',
    'settings.view', 'settings.edit', 'settings.users',
  ],
  CLIENT: [
    'quotes.view',
    'invoices.view',
  ],
};
