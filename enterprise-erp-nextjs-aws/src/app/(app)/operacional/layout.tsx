import { ReactNode, Suspense } from 'react';
import { OperacionalFiltersProvider } from './_components/OperacionalFiltersProvider';

export default function OperacionalLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8">Carregando...</div>}>
      <OperacionalFiltersProvider>{children}</OperacionalFiltersProvider>
    </Suspense>
  );
}

