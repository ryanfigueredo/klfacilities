import { ReactNode } from 'react';

interface ConfigLayoutProps {
  children: ReactNode;
}

export default function ConfigLayout({ children }: ConfigLayoutProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema, incluindo plano de contas,
          unidades, grupos, usuários e solicitações críticas.
        </p>
      </div>
      {children}
    </div>
  );
}
