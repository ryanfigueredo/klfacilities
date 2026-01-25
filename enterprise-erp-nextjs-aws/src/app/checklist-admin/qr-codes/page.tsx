'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

interface Unidade {
  id: string;
  nome: string;
  ativa: boolean;
  grupoNome: string;
}

export default function QRCodesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  const fetchUnidades = useCallback(async () => {
    try {
      const response = await fetch('/api/checklist/unidades');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar unidades');
      }

      const data: Unidade[] = result.data || [];

      setUnidades(data);

      // Gerar QR codes permanentes automaticamente (baseados no ID da unidade)
      generateQRCodes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  // Gera QR codes permanentes baseados no ID da unidade
  // A URL é fixa: /checklist/${unidade.id}, então o QR code nunca muda
  const generateQRCodes = async (unidades: Unidade[]) => {
    const qrCodesData: Record<string, string> = {};

    for (const unidade of unidades) {
      if (unidade.ativa) {
        // URL permanente baseada no ID da unidade (que nunca muda)
        const url = `${window.location.origin}/checklist/${unidade.id}`;
        try {
          const qrCodeDataURL = await QRCode.toDataURL(url, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          qrCodesData[unidade.id] = qrCodeDataURL;
        } catch (err) {
          console.error(`Erro ao gerar QR code para ${unidade.nome}:`, err);
        }
      }
    }

    setQrCodes(qrCodesData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando QR Codes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const unidadesAtivas = unidades.filter(u => u.ativa);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                QR Codes - Checklist Digital
              </h1>
              <p className="text-gray-600 mt-2">
              Visualize os QR codes permanentes para cada unidade
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unidadesAtivas.map(unidade => (
            <div key={unidade.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {unidade.nome}
                </h3>

                {qrCodes[unidade.id] ? (
                  <div className="mb-4">
                    <img
                      src={qrCodes[unidade.id]}
                      alt={`QR Code para ${unidade.nome}`}
                      className="mx-auto border border-gray-200 rounded"
                    />
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium text-gray-700">
                        {unidade.grupoNome}
                      </p>
                      <p className="text-xs text-gray-500">{unidade.nome}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 h-48 flex items-center justify-center bg-gray-100 rounded">
                    <p className="text-gray-500">Carregando QR Code...</p>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  <p>URL: /checklist/{unidade.id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {unidadesAtivas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma unidade ativa encontrada.</p>
          </div>
        )}
      </div>

      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .qr-container {
            page-break-inside: avoid;
            margin: 20px;
            border: 2px solid #000;
            padding: 20px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
