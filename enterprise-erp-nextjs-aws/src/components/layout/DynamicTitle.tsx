'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppSection, getSectionTitle } from '@/hooks/useAppSection';

export function DynamicTitle() {
  const section = useAppSection();
  const pathname = usePathname();
  const baseTitle = getSectionTitle(section);

  useEffect(() => {
    // Aguardar um pouco para garantir que metadata do Next.js seja aplicado primeiro
    const timeout = setTimeout(() => {
      // Se estiver na landing page (root), usar "KL Facilities"
      if (pathname === '/') {
        document.title = 'KL Facilities';
        return;
      }

      // Se estiver em páginas públicas da landing (banco-talentos, compliance)
      if (pathname.startsWith('/banco-talentos') || pathname.startsWith('/compliance')) {
        // Manter metadata específico se já foi definido, caso contrário usar "KL Facilities"
        if (!document.title || document.title === 'ERP KL' || document.title === baseTitle) {
          document.title = 'KL Facilities';
        }
        return;
      }

      // Para páginas do ERP, usar "ERP KL" como padrão
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/movimentos') || 
          pathname.startsWith('/config') || pathname.startsWith('/auditoria') ||
          pathname.startsWith('/rh') || pathname.startsWith('/provisionamento') ||
          pathname.startsWith('/perfil') || pathname.startsWith('/ponto/admin')) {
        // Só atualizar se o título ainda for genérico ou da landing page
        if (!document.title || document.title === 'KL Facilities' || 
            document.title === baseTitle || document.title === 'Financeiro') {
          document.title = 'ERP KL';
        }
        return;
      }

      // Para outras páginas, usar o título base da seção
      if (!document.title || document.title === 'KL Facilities') {
        document.title = baseTitle;
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [pathname, baseTitle]);

  return null;
}
