import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-use-a-real-secret'
);

export const AUTH_COOKIE = 'session_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ------------------------------------------------------------------
// Password utilities
// ------------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ------------------------------------------------------------------
// JWT utilities
// ------------------------------------------------------------------

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Cookie helpers
// ------------------------------------------------------------------

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(AUTH_COOKIE)?.value;
}

// ------------------------------------------------------------------
// Current user helpers (used across the app)
// ------------------------------------------------------------------

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/** Get current user's email (used by audit logging) */
export async function getAdminEmail(): Promise<string> {
  const user = await getCurrentUser();
  return user?.email ?? 'admin@unknown';
}

/** Get current user's role */
export async function getUserRole(): Promise<'super_admin' | 'admin' | 'client'> {
  const user = await getCurrentUser();
  if (user?.role === 'SUPER_ADMIN') return 'super_admin';
  if (user?.role === 'ADMIN') return 'admin';
  return 'client';
}

/** Returns true for both ADMIN and SUPER_ADMIN */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin' || role === 'super_admin';
}

export async function isSuperAdmin(): Promise<boolean> {
  return (await getUserRole()) === 'super_admin';
}

/** Get the Client record linked to the current user (for CLIENT role filtering) */
export async function getCurrentClientId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CLIENT') return null;

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return client?.id ?? null;
}
