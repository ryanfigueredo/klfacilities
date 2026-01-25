'use client';

import { useState } from 'react';

type Props = {
  month: string;
  unidadeId: string;
  baseUrl?: string;
};

export function ExportFuncionario({ month, unidadeId, baseUrl = '' }: Props) {
  const [cpf, setCpf] = useState('');
  const [proto, setProto] = useState('');

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const download = () => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) {
      alert('Informe um CPF válido com 11 dígitos');
      return;
    }
    // Remover validação restritiva - deixar backend validar se CPF existe
    // CPFs como 11111111111 podem existir no sistema para testes/demos
    const url = `${baseUrl}/api/ponto/folha?month=${encodeURIComponent(
      month
    )}&cpf=${encodeURIComponent(clean)}&unidadeId=${encodeURIComponent(
      unidadeId
    )}`;
    // Abrir em nova aba para download do PDF
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
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
            // Aplica formatação enquanto digita
            const formatted = formatCPF(limited);
            setCpf(formatted);
          }}
          placeholder="000.000.000-00"
          maxLength={14}
          className="border rounded px-2 py-1"
        />
        <button onClick={download} className="px-2 py-1 rounded border text-sm">
          Exportar PDF do funcionário
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={proto}
          onChange={e => setProto(e.target.value)}
          placeholder="Protocolo do mês (KL-...)"
          className="border rounded px-2 py-1"
        />
        <button
          onClick={() => {
            const p = proto.trim();
            if (!p) return;
            const url = `/ponto/protocolo?proto=${encodeURIComponent(p)}`;
            window.open(url, '_blank');
          }}
          className="px-2 py-1 rounded border text-sm"
        >
          Ver protocolo com fotos
        </button>
      </div>
    </div>
  );
}
