'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, CheckCircle, Clock, Archive, AlertCircle, Filter, Search, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Manifestacao {
  id: string;
  tipo: string;
  mensagem: string;
  funcionarioNome: string | null;
  funcionarioCpf: string | null;
  status: string;
  resposta: string | null;
  respondidoPor: {
    id: string;
    name: string;
  } | null;
  respondidoEm: string | null;
  createdAt: string;
  grupo: {
    id: string;
    nome: string;
  } | null;
  unidade: {
    id: string;
    nome: string;
  } | null;
}

interface Unidade {
  id: string;
  nome: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  EM_ANALISE: { label: 'Em Análise', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  RESOLVIDA: { label: 'Resolvida', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  ARQUIVADA: { label: 'Arquivada', color: 'bg-gray-100 text-gray-800', icon: Archive },
};

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  ELOGIO: { label: 'Elogio', color: 'bg-green-50 text-green-700 border-green-200' },
  SUGESTAO: { label: 'Sugestão', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  DENUNCIA: { label: 'Denúncia', color: 'bg-red-50 text-red-700 border-red-200' },
};

export default function CentralAtendimentoPage() {
  const [manifestacoes, setManifestacoes] = useState<Manifestacao[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUnidades, setExpandedUnidades] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [respostaText, setRespostaText] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [manifestacoesRes, unidadesRes] = await Promise.all([
        fetch('/api/manifestacoes'),
        fetch('/api/unidades'),
      ]);

      if (!manifestacoesRes.ok) {
        const errorData = await manifestacoesRes.json().catch(() => ({}));
        console.error('Erro ao buscar manifestações:', manifestacoesRes.status, errorData);
        if (manifestacoesRes.status === 401 || manifestacoesRes.status === 403) {
          toast.error('Você não tem permissão para acessar esta página');
        } else {
          toast.error('Erro ao carregar manifestações');
        }
      } else {
        const manifestacoesData = await manifestacoesRes.json();
        setManifestacoes(manifestacoesData.manifestacoes || []);
      }

      if (!unidadesRes.ok) {
        console.error('Erro ao buscar unidades:', unidadesRes.status);
        toast.error('Erro ao carregar unidades');
      } else {
        const unidadesData = await unidadesRes.json();
        if (Array.isArray(unidadesData)) {
          setUnidades(unidadesData.map((u: any) => ({ id: u.id, nome: u.nome })));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filteredManifestacoes = useMemo(() => {
    let filtered = manifestacoes;

    if (selectedUnidade) {
      filtered = filtered.filter((m) => m.unidade?.id === selectedUnidade);
    }

    if (selectedStatus) {
      filtered = filtered.filter((m) => m.status === selectedStatus);
    }

    if (selectedTipo) {
      filtered = filtered.filter((m) => m.tipo === selectedTipo);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.mensagem.toLowerCase().includes(term) ||
          (m.funcionarioNome && m.funcionarioNome.toLowerCase().includes(term)) ||
          (m.funcionarioCpf && m.funcionarioCpf.includes(term))
      );
    }

    return filtered;
  }, [manifestacoes, selectedUnidade, selectedStatus, selectedTipo, searchTerm]);

  const manifestacoesPorUnidade = useMemo(() => {
    const grouped = new Map<string, Manifestacao[]>();
    filteredManifestacoes.forEach((manifestacao) => {
      const grupoNome = manifestacao.grupo?.nome || 'Sem Grupo';
      const unidadeNome = manifestacao.unidade?.nome || 'Sem Unidade';
      const key = `${grupoNome} - ${unidadeNome}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(manifestacao);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredManifestacoes]);

  const toggleUnidade = (unidadeNome: string) => {
    setExpandedUnidades((prev) => {
      const next = new Set(prev);
      if (next.has(unidadeNome)) {
        next.delete(unidadeNome);
      } else {
        next.add(unidadeNome);
      }
      return next;
    });
  };

  const handleStatusChange = async (manifestacaoId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/manifestacoes/${manifestacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      toast.success('Status atualizado com sucesso');
      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleResponder = async (manifestacaoId: string) => {
    if (!respostaText.trim()) {
      toast.error('Por favor, escreva uma resposta');
      return;
    }

    try {
      const response = await fetch(`/api/manifestacoes/${manifestacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resposta: respostaText,
          status: 'RESOLVIDA',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao responder manifestação');
      }

      toast.success('Resposta enviada com sucesso');
      setEditingId(null);
      setRespostaText('');
      await fetchData();
    } catch (error) {
      console.error('Erro ao responder manifestação:', error);
      toast.error('Erro ao responder manifestação');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Central de Atendimento ao Funcionário</h1>
        <p className="text-gray-600">Gerencie elogios, sugestões e denúncias dos colaboradores</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mensagem, nome, CPF..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Unidade
            </label>
            <select
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as unidades</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os tipos</option>
              <option value="ELOGIO">Elogio</option>
              <option value="SUGESTAO">Sugestão</option>
              <option value="DENUNCIA">Denúncia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedUnidade('');
                setSelectedStatus('');
                setSelectedTipo('');
                setSearchTerm('');
              }}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_LABELS).map(([key, { label, color, icon: Icon }]) => {
          const count = filteredManifestacoes.filter((m) => m.status === key).length;
          return (
            <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div className={`${color} rounded-full p-3`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de manifestações agrupadas por unidade */}
      <div className="space-y-4">
        {manifestacoesPorUnidade.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma manifestação encontrada</p>
          </div>
        ) : (
          manifestacoesPorUnidade.map(([unidadeNome, manifestacoesUnidade]) => {
            const isExpanded = expandedUnidades.has(unidadeNome);
            return (
              <div key={unidadeNome} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleUnidade(unidadeNome)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="transition-transform duration-300">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">{unidadeNome}</h2>
                    <span className="text-sm text-gray-500">
                      ({manifestacoesUnidade.length} {manifestacoesUnidade.length === 1 ? 'manifestação' : 'manifestações'})
                    </span>
                  </div>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="divide-y divide-gray-100">
                    {manifestacoesUnidade.map((manifestacao) => {
                      const StatusIcon = STATUS_LABELS[manifestacao.status]?.icon || Clock;
                      const statusColor = STATUS_LABELS[manifestacao.status]?.color || 'bg-gray-100 text-gray-800';
                      const tipoLabel = TIPO_LABELS[manifestacao.tipo];

                      return (
                        <div key={manifestacao.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${tipoLabel.color}`}>
                                  {tipoLabel.label}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor} flex items-center gap-1`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {STATUS_LABELS[manifestacao.status]?.label || manifestacao.status}
                                </span>
                                {manifestacao.grupo && (
                                  <span className="text-sm text-gray-600">
                                    Grupo: {manifestacao.grupo.nome}
                                  </span>
                                )}
                                {manifestacao.unidade && (
                                  <span className="text-sm text-gray-600">
                                    Unidade: {manifestacao.unidade.nome}
                                  </span>
                                )}
                                {manifestacao.funcionarioNome && (
                                  <span className="text-sm text-gray-600">
                                    Por: {manifestacao.funcionarioNome}
                                  </span>
                                )}
                              </div>

                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{manifestacao.mensagem}</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                                {manifestacao.grupo && (
                                  <div>
                                    <span className="font-medium">Grupo:</span> {manifestacao.grupo.nome}
                                  </div>
                                )}
                                {manifestacao.unidade && (
                                  <div>
                                    <span className="font-medium">Unidade:</span> {manifestacao.unidade.nome}
                                  </div>
                                )}
                                {manifestacao.funcionarioCpf && (
                                  <div>
                                    <span className="font-medium">CPF:</span> {manifestacao.funcionarioCpf}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">Enviado em:</span> {formatDate(manifestacao.createdAt)}
                                </div>
                                {manifestacao.respondidoPor && manifestacao.respondidoEm && (
                                  <>
                                    <div>
                                      <span className="font-medium">Respondido por:</span> {manifestacao.respondidoPor.name}
                                    </div>
                                    <div>
                                      <span className="font-medium">Respondido em:</span> {formatDate(manifestacao.respondidoEm)}
                                    </div>
                                  </>
                                )}
                              </div>

                              {manifestacao.resposta && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-sm font-medium text-blue-900 mb-1">Resposta:</p>
                                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{manifestacao.resposta}</p>
                                </div>
                              )}

                              {editingId === manifestacao.id && (
                                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Resposta:
                                  </label>
                                  <textarea
                                    value={respostaText}
                                    onChange={(e) => setRespostaText(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                                    placeholder="Digite sua resposta aqui..."
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleResponder(manifestacao.id)}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Enviar Resposta
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingId(null);
                                        setRespostaText('');
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              {!manifestacao.resposta && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingId(manifestacao.id);
                                    setRespostaText('');
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Responder
                                </Button>
                              )}

                              <select
                                value={manifestacao.status}
                                onChange={(e) => handleStatusChange(manifestacao.id, e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              >
                                {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                                  <option key={key} value={key}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

