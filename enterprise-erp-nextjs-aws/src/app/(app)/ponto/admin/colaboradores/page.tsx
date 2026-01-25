'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rh/colaboradores');
  }, [router]);

  return <div className="p-6">Redirecionando...</div>;
}
