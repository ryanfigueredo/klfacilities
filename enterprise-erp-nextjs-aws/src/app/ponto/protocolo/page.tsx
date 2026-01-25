'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface RegistroPonto {
  id: string;
  timestamp: string;
  tipo: string;
  selfieHttpUrl: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

interface ProtocoloData {
  ok: boolean;
  data: Record<string, RegistroPonto[]>;
  funcionario: {
    id: string;
    nome: string;
    cpf: string | null;
    grupo: { id: string; nome: string } | null;
    unidade: { id: string; nome: string } | null;
  } | null;
  month: string;
}

const TIPO_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  ENTRADA: { label: 'Entrada', color: '#4CAF50', icon: '→' },
  SAIDA: { label: 'Saída', color: '#f44336', icon: '←' },
  INTERVALO_INICIO: { label: 'Início Intervalo', color: '#FF9800', icon: '⏸' },
  INTERVALO_FIM: { label: 'Fim Intervalo', color: '#2196F3', icon: '▶' },
  HORA_EXTRA_INICIO: { label: 'Hora Extra - Início', color: '#9C27B0', icon: '⭐' },
  HORA_EXTRA_FIM: { label: 'Hora Extra - Fim', color: '#E91E63', icon: '⭐' },
};

export default function ProtocoloPage() {
  const searchParams = useSearchParams();
  const proto = searchParams.get('proto') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProtocoloData | null>(null);

  useEffect(() => {
    if (!proto) {
      setError('Protocolo não informado');
      setLoading(false);
      return;
    }

    const fetchProtocolo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/ponto/protocolo?proto=${encodeURIComponent(proto)}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao buscar protocolo');
        }

        setData(result);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar protocolo');
      } finally {
        setLoading(false);
      }
    };

    fetchProtocolo();
  }, [proto]);

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarHora = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando protocolo...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro ao carregar protocolo</h1>
          <p className="text-gray-600 mb-4">{error || 'Protocolo não encontrado'}</p>
          <p className="text-sm text-gray-500 font-mono bg-gray-100 p-2 rounded">
            {proto || 'Nenhum protocolo informado'}
          </p>
        </div>
      </div>
    );
  }

  const dias = Object.keys(data.data).sort();
  const totalRegistros = Object.values(data.data).reduce((acc, registros) => acc + registros.length, 0);
  const totalComFoto = Object.values(data.data).reduce(
    (acc, registros) => acc + registros.filter((r) => r.selfieHttpUrl).length,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Protocolo de Ponto</h1>
              <p className="text-sm text-gray-600 mt-1 font-mono">{proto}</p>
            </div>
            <div className="text-right">
              {data.funcionario && (
                <>
                  <p className="text-lg font-semibold text-gray-900">{data.funcionario.nome}</p>
                  {data.funcionario.cpf && (
                    <p className="text-sm text-gray-600">CPF: {data.funcionario.cpf}</p>
                  )}
                  {data.funcionario.unidade && (
                    <p className="text-sm text-gray-600">{data.funcionario.unidade.nome}</p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <span className="text-gray-600">Mês:</span>{' '}
              <span className="font-semibold">
                {new Date(`${data.month}-01`).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total de registros:</span>{' '}
              <span className="font-semibold">{totalRegistros}</span>
            </div>
            <div>
              <span className="text-gray-600">Registros com foto:</span>{' '}
              <span className="font-semibold text-green-600">{totalComFoto}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {dias.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Nenhum registro encontrado para este protocolo.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dias.map((dia) => {
              const registros = data.data[dia];
              const dataFormatada = new Date(dia).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });

              return (
                <div key={dia} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-blue-600 text-white px-6 py-3">
                    <h2 className="text-lg font-semibold capitalize">{dataFormatada}</h2>
                    <p className="text-sm text-blue-100">
                      {registros.length} registro{registros.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {registros.map((registro) => {
                        const tipoInfo = TIPO_LABELS[registro.tipo] || {
                          label: registro.tipo,
                          color: '#666',
                          icon: '•',
                        };

                        return (
                          <div
                            key={registro.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-2xl"
                                  style={{ color: tipoInfo.color }}
                                >
                                  {tipoInfo.icon}
                                </span>
                                <div>
                                  <p
                                    className="font-semibold text-sm"
                                    style={{ color: tipoInfo.color }}
                                  >
                                    {tipoInfo.label}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatarHora(registro.timestamp)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {registro.selfieHttpUrl ? (
                              <div className="mt-3">
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                                  <Image
                                    src={registro.selfieHttpUrl}
                                    alt={`Selfie - ${tipoInfo.label} - ${formatarHora(registro.timestamp)}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                    onError={(e) => {
                                      console.error('Erro ao carregar imagem:', registro.selfieHttpUrl);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <button
                                  onClick={() => window.open(registro.selfieHttpUrl!, '_blank')}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline w-full text-center"
                                >
                                  Abrir foto em tamanho maior
                                </button>
                              </div>
                            ) : (
                              <div className="mt-3 p-8 bg-gray-100 rounded-lg text-center">
                                <p className="text-xs text-gray-500">Foto não disponível</p>
                              </div>
                            )}

                            {(registro.lat !== null || registro.lng !== null) && (
                              <div className="mt-2 text-xs text-gray-500">
                                📍 GPS: {registro.lat?.toFixed(6)}, {registro.lng?.toFixed(6)}
                                {registro.accuracy && ` (±${Math.round(registro.accuracy)}m)`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pb-8 text-center text-sm text-gray-500">
        <p>KL Facilities - Sistema de Ponto Eletrônico</p>
        <p className="mt-1">Protocolo gerado em {new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
