export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { ProvisionamentoPageClient } from './ProvisionamentoPageClient';

export default async function ProvisionamentoPage() {
  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Provisionamento
        </h1>
        <p className="text-sm text-muted-foreground">
          Reserva de recursos para despesas futuras (13º salário, impostos, férias, etc.)
        </p>
      </div>
      <ProvisionamentoPageClient />
    </main>
  );
}
