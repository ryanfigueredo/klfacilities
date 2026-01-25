'use client';

import { useState } from 'react';
import { Search, MapPin, Calendar, User, Building, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const tipoLabels: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  INTERVALO_INICIO: 'Intervalo - Início',
  INTERVALO_FIM: 'Intervalo - Fim',
  HORA_EXTRA_INICIO: 'Hora Extra - Início',
  HORA_EXTRA_FIM: 'Hora Extra - Fim',
};

// Componente para exibir cada registro com estado próprio para erro de imagem
function RegistroItem({ registro }: { registro: RegistroPonto }) {
  const [imageError, setImageError] = useState(false);

  const abrirMapa = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const formatarData = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Selfie */}
        {registro.selfieHttpUrl && !imageError ? (
          <div className="flex-shrink-0 relative">
            <img
              src={registro.selfieHttpUrl}
              alt="Prova de vida"
              className="w-32 h-32 object-cover rounded-lg border border-gray-300"
              crossOrigin="anonymous"
              loading="lazy" // Lazy loading: carrega apenas quando visível
              decoding="async" // Decodificação assíncrona para não bloquear renderização
              onError={(e) => {
                console.error('[Protocolo] Erro ao carregar selfie:', {
                  url: registro.selfieHttpUrl,
                  error: e,
                  tipo: registro.tipo,
                  timestamp: registro.timestamp,
                });
                setImageError(true);
              }}
              onLoad={() => {
                console.log('[Protocolo] Selfie carregada com sucesso:', registro.selfieHttpUrl?.substring(0, 50) + '...');
              }}
            />
            <button
              onClick={() => window.open(registro.selfieHttpUrl!, '_blank')}
              className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 rounded-b-lg hover:bg-black/70 transition-colors"
              title="Abrir foto em tamanho maior"
            >
              Ver maior
            </button>
          </div>
        ) : (
          <div className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg border border-gray-300 flex flex-col items-center justify-center">
            <FileText className="h-8 w-8 text-gray-400" />
            {imageError ? (
              <p className="text-xs text-red-500 mt-1">Erro ao carregar</p>
            ) : !registro.selfieHttpUrl ? (
              <p className="text-xs text-gray-500 mt-1">Sem foto</p>
            ) : null}
          </div>
        )}

        {/* Informações */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-lg">
                {tipoLabels[registro.tipo] || registro.tipo}
              </p>
              <p className="text-sm text-gray-600">
                {formatarData(registro.timestamp)}
              </p>
            </div>
          </div>

          {/* Localização */}
          {registro.lat && registro.lng && (
            <div className="mt-3">
              <button
                onClick={() => abrirMapa(registro.lat!, registro.lng!)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                <MapPin className="h-4 w-4" />
                Ver localização no mapa
                {registro.accuracy && (
                  <span className="text-gray-500 text-xs">
                    (Precisão: {Math.round(registro.accuracy)}m)
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProtocoloPontoPage() {
  const [protocolo, setProtocolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProtocoloData | null>(null);

  const buscarProtocolo = async () => {
    const proto = protocolo.trim();
    if (!proto || !proto.startsWith('KL-')) {
      setError('Protocolo inválido. Deve começar com KL-');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/ponto/protocolo?proto=${encodeURIComponent(proto)}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Erro ao buscar protocolo');
      }

      // Log para debug
      const dataValues = Object.values(json.data || {}) as any[][];
      const totalRegistros = dataValues.reduce((acc: number, registros: any[]) => acc + (Array.isArray(registros) ? registros.length : 0), 0);
      const totalComFotos = dataValues.reduce((acc: number, registros: any[]) => 
        acc + (Array.isArray(registros) ? registros.filter((r: any) => r.selfieHttpUrl).length : 0), 0
      );
      const primeiroDia = Array.isArray(dataValues[0]) ? dataValues[0] : [];
      console.log('[Protocolo Frontend] 📥 Dados recebidos:', {
        ok: json.ok,
        totalRegistros,
        totalComFotos,
        dias: Object.keys(json.data || {}).length,
        funcionario: json.funcionario?.nome,
        month: json.month,
        amostraRegistros: primeiroDia.slice(0, 2).map((r: any) => ({
          id: r.id,
          tipo: r.tipo,
          temSelfieHttpUrl: !!r.selfieHttpUrl,
          selfieHttpUrl: r.selfieHttpUrl ? r.selfieHttpUrl.substring(0, 50) + '...' : null,
        })),
      });

      setData(json);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar protocolo');
    } finally {
      setLoading(false);
    }
  };

  const diasOrdenados = data?.data ? Object.keys(data.data).sort() : [];

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Buscar Protocolo de Ponto</h1>
        <p className="text-gray-600">
          Digite o protocolo da folha de ponto para visualizar as provas de vida e localizações
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={protocolo}
              onChange={(e) => setProtocolo(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  buscarProtocolo();
                }
              }}
              placeholder="KL-XXXXXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={buscarProtocolo}
            disabled={loading || !protocolo.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Buscar
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Informações do Funcionário */}
          {data.funcionario && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Funcionário
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nome</p>
                  <p className="font-semibold">{data.funcionario.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CPF</p>
                  <p className="font-semibold">{data.funcionario.cpf || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mês</p>
                  <p className="font-semibold">
                    {format(new Date(`${data.month}-01`), 'MMMM yyyy', { locale: ptBR })}
                  </p>
                </div>
                {data.funcionario.grupo && (
                  <div>
                    <p className="text-sm text-gray-500">Grupo</p>
                    <p className="font-semibold">{data.funcionario.grupo.nome}</p>
                  </div>
                )}
                {data.funcionario.unidade && (
                  <div>
                    <p className="text-sm text-gray-500">Unidade</p>
                    <p className="font-semibold">{data.funcionario.unidade.nome}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registros por Dia */}
          {diasOrdenados.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              Nenhum registro encontrado para este protocolo.
            </div>
          ) : (
            diasOrdenados.map((dia) => {
              const registros = data.data[dia];
              const dataDia = new Date(dia);
              const diaFormatado = format(dataDia, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

              return (
                <div key={dia} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {diaFormatado}
                  </h3>
                  <div className="space-y-4">
                    {registros.map((registro) => (
                      <RegistroItem key={registro.id} registro={registro} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
