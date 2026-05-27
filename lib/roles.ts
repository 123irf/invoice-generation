export type AppRole = 'super_admin' | 'admin' | 'client';

/** Routes each role can access */
const ROLE_ROUTES: Record<AppRole, string[]> = {
  super_admin: ['/dashboard', '/clients', '/invoice-generation', '/invoices', '/settings'],
  admin: ['/dashboard', '/clients', '/invoice-generation', '/invoices', '/settings'],
  client: ['/invoice-generation', '/invoices'],
};

export function getAllowedRoutes(role: AppRole): string[] {
  return ROLE_ROUTES[role];
}

/** Default landing page after login */
export function getDefaultRoute(role: AppRole): string {
  return role === 'client' ? '/invoice-generation?type=invoices' : '/dashboard';
}
