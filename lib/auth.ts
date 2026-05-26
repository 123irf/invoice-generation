import { auth, currentUser } from '@clerk/nextjs/server';

export async function getAdminUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return user;
}

export async function getAdminEmail() {
  const user = await getAdminUser();
  return user?.emailAddresses[0]?.emailAddress ?? 'admin@unknown';
}
