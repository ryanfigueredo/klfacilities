'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ColaboradoresRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/rh/colaboradores');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}