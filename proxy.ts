import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-use-a-real-secret'
);

const AUTH_COOKIE = 'session_token';

/** Routes that don't require authentication */
const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/razorpay',
];

/** Routes restricted to ADMIN role only */
const ADMIN_ONLY_PATHS = ['/dashboard', '/clients', '/settings'];

function isPublicPath(pathname: string): boolean {
  // Exact public matches
  if (PUBLIC_PATHS.includes(pathname)) return true;

  // Public path prefixes
  if (pathname.startsWith('/sign-in')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/api/razorpay/')) return true;

  // Public token routes for clients viewing quotes/invoices
  if (pathname.startsWith('/q/') || pathname.startsWith('/i/')) return true;

  return false;
}

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (isPublicPath(pathname)) return NextResponse.next();

  // Check for session token
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Verify JWT
  let payload: { role?: string } | null = null;
  try {
    const result = await jwtVerify(token, JWT_SECRET);
    payload = result.payload as { role?: string };
  } catch {
    // Invalid/expired token — redirect to sign-in
    const res = NextResponse.redirect(new URL('/sign-in', req.url));
    res.cookies.delete(AUTH_COOKIE);
    return res;
  }

  // Role-based access: block CLIENT role from admin-only routes
  if (isAdminOnlyPath(pathname)) {
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/invoice-generation?type=invoices', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
