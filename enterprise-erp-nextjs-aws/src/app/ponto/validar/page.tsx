'use client';

import { useEffect, useMemo, useState } from 'react';

export default function ValidarPontoPage() {
  const [cpf, setCpf] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const unidade = useMemo(
    () => new URL(window.location.href).searchParams.get('unidade') || '',
    []
  );
  const month = useMemo(
    () => new URL(window.location.href).searchParams.get('month') || '',
    []
  );
  const [msg, setMsg] = useState('');

  const buscar = async () => {
    setMsg('');
    setRows([]);
    if (!cpf || !month) {
      setMsg('Informe CPF e mês.');
      return;
    }
    try {
      const r = await fetch(
        `/api/ponto/registros?month=${encodeURIComponent(month)}&unidadeSlug=${encodeURIComponent(unidade)}&cpf=${encodeURIComponent(cpf)}`
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Falha');
      setRows(j?.data || []);
    } catch (e: any) {
      setMsg(e?.message || 'Erro');
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Validar presença</h1>
      <div className="text-sm text-muted-foreground">
        Unidade: {unidade || '-'} • Mês: {month || '-'}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={cpf}
          onChange={e => {
            // Remove tudo que não é número
            const onlyNumbers = e.target.value.replace(/\D/g, '');
            // Limita a 11 dígitos (CPF)
            const limited = onlyNumbers.slice(0, 11);
            setCpf(limited);
          }}
          placeholder="CPF"
          className="border rounded px-2 py-1"
        />
        <button
          onClick={buscar}
          className="px-3 py-1 rounded bg-black text-white"
        >
          Buscar
        </button>
      </div>
      {msg && <div className="text-sm">{msg}</div>}
      {rows.length > 0 && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th className="p-2">Data</th>
                <th className="p-2">Hora</th>
                <th className="p-2">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const dt = new Date(r.timestamp);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{dt.toISOString().slice(0, 10)}</td>
                    <td className="p-2">{dt.toISOString().slice(11, 19)}</td>
                    <td className="p-2">{r.tipo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
