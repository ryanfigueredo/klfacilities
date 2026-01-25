'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type KpisProps = {
  className?: string;
  onReady?: (vals: { aPagar: number; aReceber: number }) => void;
};

export function ProvisionKpis({ className, onReady }: KpisProps) {
  const [loading, setLoading] = React.useState(true);
  const [aPagar, setAPagar] = React.useState(0);
  const [aReceber, setAReceber] = React.useState(0);
  const [countPagar, setCountPagar] = React.useState(0);
  const [countReceber, setCountReceber] = React.useState(0);

  const brl = (n: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(n || 0);

  const load = async () => {
    setLoading(true);
    try {
      const start = new Date();
      const end = addDays(start, 30);
      const qs = new URLSearchParams();
      qs.set('status', 'PENDENTE');
      qs.set('from', format(start, 'yyyy-MM-dd'));
      qs.set('to', format(end, 'yyyy-MM-dd'));
      const res = await fetch(`/api/provisionamentos?${qs.toString()}`);
      const data = await res.json();
      let pagar = 0,
        receber = 0,
        cP = 0,
        cR = 0;
      (data?.rows ?? data?.data ?? []).forEach((p: any) => {
        const v = Math.abs(
          Number(typeof p.valor === 'string' ? parseFloat(p.valor) : p.valor)
        );
        if (p.tipo === 'DESPESA') {
          pagar += v;
          cP += 1;
        } else {
          receber += v;
          cR += 1;
        }
      });
      setAPagar(pagar);
      setAReceber(receber);
      setCountPagar(cP);
      setCountReceber(cR);
      onReady?.({ aPagar: pagar, aReceber: receber });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A pagar (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? '—' : brl(aPagar)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {countPagar} itens
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A receber (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? '—' : brl(aReceber)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {countReceber} itens
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
