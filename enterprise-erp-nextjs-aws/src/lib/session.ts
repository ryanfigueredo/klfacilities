import { getServerSession } from 'next-auth';

import { authOptions } from './auth-server';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function getCurrentUserRole() {
  const user = await getCurrentUser();
  return user?.role;
}
