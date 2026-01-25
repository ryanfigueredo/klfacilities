import { useSession } from 'next-auth/react';

export function useCurrentUser() {
  const { data: session } = useSession();
  return session?.user;
}

export function useCurrentUserRole() {
  const user = useCurrentUser();
  return user?.role;
}
