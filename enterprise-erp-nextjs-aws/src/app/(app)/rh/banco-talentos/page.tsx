'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Eye,
  X,
  CheckCircle,
  Clock,
  UserX,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { hasRouteAccess } from '@/lib/rbac';
import { saveAs } from 'file-saver';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Curriculo {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  arquivoUrl: string;
  observacoes: string | null;
  status: string;
  origem: string;
  origemId: string | null;
  origemDados?: any;
  createdAt: string;
  unidade: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
  };
}

interface Unidade {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  ativa?: boolean;
}

interface Estado {
  sigla: string;
  cidades: string[];
}

const STATUS_LABELS: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  PENDENTE: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  CONTATADO: {
    label: 'Contatado',
    color: 'bg-blue-100 text-blue-800',
    icon: Eye,
  },
  CONTRATADO: {
    label: 'Contratado',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  DESCARTADO: {
    label: 'Descartado',
    color: 'bg-red-100 text-red-800',
    icon: X,
  },
};

export default function BancoTalentosAdminPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as
    | 'MASTER'
    | 'ADMIN'
    | 'RH'
    | 'SUPERVISOR'
    | 'OPERACIONAL'
    | undefined;
  const isAdmin = hasRouteAccess(userRole, ['MASTER', 'ADMIN']);

  const [curriculos, setCurriculos] = useState<Curriculo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCidade, setSelectedCidade] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCidades, setExpandedCidades] = useState<Set<string>>(
    new Set()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [curriculoToDelete, setCurriculoToDelete] = useState<Curriculo | null>(
    null
  );
  const [novoCurriculoDialogOpen, setNovoCurriculoDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedShareCities, setSelectedShareCities] = useState<string[]>([]);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [formNovoCurriculo, setFormNovoCurriculo] = useState({
    nome: '',
    sobrenome: '',
    telefone: '',
    estado: '',
    cidade: '',
    email: '',
    endereco: '',
    observacoes: '',
  });
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [vinculacaoDialogOpen, setVinculacaoDialogOpen] = useState(false);
  const [curriculoParaVincular, setCurriculoParaVincular] =
    useState<Curriculo | null>(null);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('');
  const [vinculando, setVinculando] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [curriculosRes, estadosRes] = await Promise.all([
        fetch('/api/curriculos'),
        fetch('/api/curriculos/unidades'),
      ]);

      if (curriculosRes.status === 403) {
        setCurriculos([]);
        toast.warning('Você não tem permissão para esses currículos');
      } else if (!curriculosRes.ok) {
        const errorData = await curriculosRes.json().catch(() => ({}));
        console.error(
          'Erro ao buscar currículos:',
          curriculosRes.status,
          errorData
        );
        if (curriculosRes.status === 401 || curriculosRes.status === 403) {
          toast.error('Você não tem permissão para acessar esta página');
        } else {
          toast.error('Erro ao carregar currículos');
        }
      } else {
        const curriculosData = await curriculosRes.json();
        setCurriculos(curriculosData.curriculos || []);

        // Extrair unidades únicas dos currículos
        const unidadesUnicas = new Map<string, Unidade>();
        curriculosData.curriculos?.forEach((c: Curriculo) => {
          if (c.unidade && !unidadesUnicas.has(c.unidade.id)) {
            unidadesUnicas.set(c.unidade.id, {
              id: c.unidade.id,
              nome: c.unidade.nome,
              cidade: c.unidade.cidade,
              estado: c.unidade.estado,
            });
          }
        });
        setUnidades(Array.from(unidadesUnicas.values()));

        // Buscar todas as unidades ativas para o select de vinculação
        try {
          const unidadesRes = await fetch(
            '/api/unidades?view=table&status=ativas&pageSize=1000'
          );
          if (unidadesRes.ok) {
            const unidadesData = await unidadesRes.json();
            const todasUnidades =
              unidadesData.rows?.map((r: any) => ({
                id: r.unidadeId,
                nome: r.unidadeNome,
                cidade: r.cidade,
                estado: r.estado,
                ativa: r.ativa,
              })) || [];
            // Combinar com unidades dos currículos e remover duplicatas
            todasUnidades.forEach((u: Unidade) => {
              if (!unidadesUnicas.has(u.id)) {
                unidadesUnicas.set(u.id, u);
              }
            });
            setUnidades(Array.from(unidadesUnicas.values()));
          }
        } catch (error) {
          console.error('Erro ao buscar unidades:', error);
        }
      }

      if (estadosRes.ok) {
        const estadosData = await estadosRes.json();
        setEstados(estadosData.estados || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formNovoCurriculo.estado) {
      fetchCidades(formNovoCurriculo.estado);
    } else {
      setCidadesDisponiveis([]);
    }
  }, [formNovoCurriculo.estado]);

  const fetchCidades = async (estado: string) => {
    if (!estado) return;
    setLoadingCidades(true);
    try {
      const res = await fetch(`/api/curriculos/unidades?estado=${estado}`);
      if (res.ok) {
        const data = await res.json();
        setCidadesDisponiveis(data.cidades || []);
      }
    } catch (error) {
      console.error('Erro ao buscar cidades:', error);
    } finally {
      setLoadingCidades(false);
    }
  };

  // Currículos para estatísticas (inclui descartados)
  const curriculosParaEstatisticas = useMemo(() => {
    let filtered = curriculos;

    if (selectedCidade) {
      filtered = filtered.filter(c => c.unidade.cidade === selectedCidade);
    }

    if (selectedStatus) {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.nome.toLowerCase().includes(term) ||
          c.sobrenome.toLowerCase().includes(term) ||
          c.telefone.includes(term) ||
          (c.email && c.email.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [curriculos, selectedCidade, selectedStatus, searchTerm]);

  // Currículos para visualização (exclui descartados)
  const filteredCurriculos = useMemo(() => {
    return curriculosParaEstatisticas.filter(c => c.status !== 'DESCARTADO');
  }, [curriculosParaEstatisticas]);

  const curriculosPorCidade = useMemo(() => {
    const grouped = new Map<
      string,
      { cidade: string; estado: string | null; curriculos: Curriculo[] }
    >();
    filteredCurriculos.forEach(curriculo => {
      const cidade = curriculo.unidade.cidade || 'Sem cidade';
      const estado = curriculo.unidade.estado;
      const key = `${cidade}-${estado || ''}`;

      if (!grouped.has(key)) {
        grouped.set(key, { cidade, estado, curriculos: [] });
      }
      grouped.get(key)!.curriculos.push(curriculo);
    });
    return Array.from(grouped.values()).sort((a, b) => {
      if (a.estado !== b.estado) {
        return (a.estado || '').localeCompare(b.estado || '');
      }
      return a.cidade.localeCompare(b.cidade);
    });
  }, [filteredCurriculos]);

  const toggleCidade = (cidadeKey: string) => {
    setExpandedCidades(prev => {
      const next = new Set(prev);
      if (next.has(cidadeKey)) {
        next.delete(cidadeKey);
      } else {
        next.add(cidadeKey);
      }
      return next;
    });
  };

  const shareOptions = useMemo(
    () =>
      curriculosPorCidade.map(({ cidade, estado, curriculos: list }) => {
        const key = `${cidade}-${estado || ''}`;
        const label = estado ? `${cidade}, ${estado}` : cidade;
        return { key, label, count: list.length };
      }),
    [curriculosPorCidade]
  );

  const canShare = hasRouteAccess(userRole, [
    'MASTER',
    'ADMIN',
    'RH',
    'OPERACIONAL',
    'SUPERVISOR',
  ]);

  const toggleShareCity = (key: string) => {
    setSelectedShareCities(prev =>
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    );
  };

  const handleShareCurriculos = async () => {
    if (!selectedShareCities.length) {
      toast.error('Selecione ao menos uma cidade');
      return;
    }

    try {
      setGeneratingShare(true);

      const payload = selectedShareCities
        .map(key => {
          const option = shareOptions.find(opt => opt.key === key);
          const group = curriculosPorCidade.find(
            ({ cidade, estado }) => `${cidade}-${estado || ''}` === key
          );
          if (!option || !group) return null;

          const curriculoIds = group.curriculos
            .filter(
              curriculo =>
                curriculo.arquivoUrl &&
                curriculo.arquivoUrl !== 'manual://sem-arquivo'
            )
            .map(curriculo => curriculo.id);

          return {
            label: option.label,
            curriculoIds,
          };
        })
        .filter(Boolean) as Array<{ label: string; curriculoIds: string[] }>;

      if (!payload.length) {
        toast.error(
          'Nenhum currículo com arquivo disponível nas cidades selecionadas'
        );
        return;
      }

      const response = await fetch('/api/curriculos/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: payload }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Erro ao gerar pacote de currículos' }));
        throw new Error(
          errorData.error || 'Erro ao gerar pacote de currículos'
        );
      }

      const skippedHeader = response.headers.get('x-skipped-files');
      const blob = await response.blob();

      if (blob.size === 0) {
        toast.error('Nenhum arquivo disponível para as cidades selecionadas');
        return;
      }

      const dateTag = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, '-');
      saveAs(blob, `curriculos-${dateTag}.zip`);

      if (skippedHeader) {
        try {
          const skipped = JSON.parse(decodeURIComponent(skippedHeader));
          if (Array.isArray(skipped) && skipped.length) {
            const nomes = skipped
              .map((item: { id: string }) => {
                const curriculo = curriculos.find(c => c.id === item.id);
                return curriculo
                  ? `${curriculo.nome} ${curriculo.sobrenome}`.trim()
                  : item.id;
              })
              .filter(Boolean);
            if (nomes.length) {
              toast.warning(
                `Alguns currículos não foram incluídos: ${nomes.join(', ')}`
              );
            }
          }
        } catch (error) {
          console.warn('Não foi possível ler itens ignorados:', error);
        }
      }

      toast.success('Pacote gerado com sucesso');
      setShareDialogOpen(false);
      setSelectedShareCities([]);
    } catch (error: any) {
      console.error('Erro ao compartilhar currículos:', error);
      toast.error(error.message || 'Erro ao gerar pacote de currículos');
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleStatusChange = async (curriculoId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/curriculos/${curriculoId}`, {
        method: 'PATCH',
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

  const handleDeleteClick = (curriculo: Curriculo) => {
    setCurriculoToDelete(curriculo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!curriculoToDelete) return;

    try {
      const response = await fetch(`/api/curriculos/${curriculoToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao excluir currículo');
      }

      toast.success('Currículo excluído com sucesso');
      setDeleteDialogOpen(false);
      setCurriculoToDelete(null);
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir currículo:', error);
      toast.error(error.message || 'Erro ao excluir currículo');
    }
  };

  const handleNovoCurriculo = async () => {
    try {
      if (
        !formNovoCurriculo.nome ||
        !formNovoCurriculo.sobrenome ||
        !formNovoCurriculo.telefone ||
        !formNovoCurriculo.estado ||
        !formNovoCurriculo.cidade
      ) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      const response = await fetch('/api/curriculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formNovoCurriculo),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao criar currículo');
      }

      toast.success('Currículo cadastrado com sucesso');
      setNovoCurriculoDialogOpen(false);
      setFormNovoCurriculo({
        nome: '',
        sobrenome: '',
        telefone: '',
        estado: '',
        cidade: '',
        email: '',
        endereco: '',
        observacoes: '',
      });
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao criar currículo:', error);
      toast.error(error.message || 'Erro ao criar currículo');
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

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Banco de Talentos
          </h1>
          <p className="text-gray-600">
            Gerencie os currículos cadastrados por cidade
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canShare && (
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(true)}
              className="flex items-center gap-2"
              disabled={curriculos.length === 0}
            >
              <Share2 className="h-4 w-4" />
              Compartilhar Currículos
            </Button>
          )}
          {isAdmin && (
            <Button
              onClick={() => setNovoCurriculoDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Currículo
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Nome, telefone, email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Cidade
            </label>
            <select
              value={selectedCidade}
              onChange={e => setSelectedCidade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as cidades</option>
              {Array.from(
                new Set(
                  unidades
                    .map(u => u.cidade)
                    .filter((c): c is string => Boolean(c))
                )
              )
                .sort()
                .map(cidade => (
                  <option key={cidade} value={cidade}>
                    {cidade}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
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
                setSelectedCidade('');
                setSelectedStatus('');
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
        {Object.entries(STATUS_LABELS).map(
          ([key, { label, color, icon: Icon }]) => {
            const count = curriculosParaEstatisticas.filter(
              c => c.status === key
            ).length;
            return (
              <div
                key={key}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
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
          }
        )}
      </div>

      {/* Lista de currículos agrupados por cidade */}
      <div className="space-y-4">
        {curriculosPorCidade.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum currículo encontrado</p>
          </div>
        ) : (
          curriculosPorCidade.map(
            ({ cidade, estado, curriculos: curriculosCidade }) => {
              const cidadeKey = `${cidade}-${estado || ''}`;
              const isExpanded = expandedCidades.has(cidadeKey);
              const cidadeDisplay = estado ? `${cidade}, ${estado}` : cidade;
              return (
                <div
                  key={cidadeKey}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleCidade(cidadeKey)}
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
                      <h2 className="text-lg font-semibold text-gray-900">
                        {cidadeDisplay}
                      </h2>
                      <span className="text-sm text-gray-500">
                        ({curriculosCidade.length}{' '}
                        {curriculosCidade.length === 1
                          ? 'currículo'
                          : 'currículos'}
                        )
                      </span>
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded
                        ? 'max-h-[2000px] opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="divide-y divide-gray-100">
                      {curriculosCidade.map(curriculo => {
                        const StatusIcon =
                          STATUS_LABELS[curriculo.status]?.icon || Clock;
                        const statusColor =
                          STATUS_LABELS[curriculo.status]?.color ||
                          'bg-gray-100 text-gray-800';

                        return (
                          <div
                            key={curriculo.id}
                            className="p-6 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {curriculo.nome} {curriculo.sobrenome}
                                  </h3>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor} flex items-center gap-1`}
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {STATUS_LABELS[curriculo.status]?.label ||
                                      curriculo.status}
                                  </span>
                                  {curriculo.origem === 'INDEED' && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      Indeed
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                                  <div>
                                    <span className="font-medium">
                                      Telefone:
                                    </span>{' '}
                                    {formatPhone(curriculo.telefone)}
                                  </div>
                                  {curriculo.email && (
                                    <div>
                                      <span className="font-medium">
                                        E-mail:
                                      </span>{' '}
                                      {curriculo.email}
                                    </div>
                                  )}
                                  {curriculo.endereco && (
                                    <div className="md:col-span-2">
                                      <span className="font-medium">
                                        Endereço:
                                      </span>{' '}
                                      {curriculo.endereco}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">
                                      Cadastrado em:
                                    </span>{' '}
                                    {formatDate(curriculo.createdAt)}
                                  </div>
                                </div>

                                {curriculo.observacoes && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">
                                        Observações:
                                      </span>{' '}
                                      {curriculo.observacoes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2">
                                {curriculo.arquivoUrl &&
                                  curriculo.arquivoUrl !==
                                    'manual://sem-arquivo' && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await fetch(
                                              `/api/curriculos/download?id=${curriculo.id}`
                                            );
                                            const data = await res.json();
                                            if (res.ok && data.url) {
                                              window.open(data.url, '_blank');
                                            } else {
                                              alert('Erro ao abrir currículo');
                                            }
                                          } catch (error) {
                                            console.error('Erro:', error);
                                            alert('Erro ao abrir currículo');
                                          }
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                      >
                                        <Eye className="h-4 w-4" />
                                        Ver Currículo
                                      </button>

                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await fetch(
                                              `/api/curriculos/download?id=${curriculo.id}`
                                            );
                                            const data = await res.json();
                                            if (res.ok && data.url) {
                                              const a =
                                                document.createElement('a');
                                              a.href = data.url;
                                              a.download = `${curriculo.nome}_${curriculo.sobrenome}_curriculo.pdf`;
                                              a.click();
                                            } else {
                                              alert('Erro ao baixar currículo');
                                            }
                                          } catch (error) {
                                            console.error('Erro:', error);
                                            alert('Erro ao baixar currículo');
                                          }
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download
                                      </button>
                                    </>
                                  )}

                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteClick(curriculo)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                  </button>
                                )}

                                <select
                                  value={curriculo.status}
                                  onChange={e =>
                                    handleStatusChange(
                                      curriculo.id,
                                      e.target.value
                                    )
                                  }
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                  {Object.entries(STATUS_LABELS).map(
                                    ([key, { label }]) => (
                                      <option key={key} value={key}>
                                        {label}
                                      </option>
                                    )
                                  )}
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
            }
          )
        )}
      </div>

      {/* Dialog de Novo Currículo */}
      <Dialog
        open={novoCurriculoDialogOpen}
        onOpenChange={setNovoCurriculoDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Currículo</DialogTitle>
            <DialogDescription>
              Cadastre um novo currículo manualmente. Campos obrigatórios: nome,
              sobrenome, telefone, estado e cidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formNovoCurriculo.nome}
                  onChange={e =>
                    setFormNovoCurriculo({
                      ...formNovoCurriculo,
                      nome: e.target.value,
                    })
                  }
                  placeholder="Nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sobrenome">
                  Sobrenome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sobrenome"
                  value={formNovoCurriculo.sobrenome}
                  onChange={e =>
                    setFormNovoCurriculo({
                      ...formNovoCurriculo,
                      sobrenome: e.target.value,
                    })
                  }
                  placeholder="Sobrenome"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="telefone">
                Telefone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefone"
                value={formNovoCurriculo.telefone}
                onChange={e =>
                  setFormNovoCurriculo({
                    ...formNovoCurriculo,
                    telefone: e.target.value,
                  })
                }
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estado">
                  Estado <span className="text-red-500">*</span>
                </Label>
                <select
                  id="estado"
                  value={formNovoCurriculo.estado}
                  onChange={e => {
                    setFormNovoCurriculo({
                      ...formNovoCurriculo,
                      estado: e.target.value,
                      cidade: '', // Limpar cidade ao mudar estado
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione o estado</option>
                  {estados.map(estado => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="cidade">
                  Cidade <span className="text-red-500">*</span>
                </Label>
                <select
                  id="cidade"
                  value={formNovoCurriculo.cidade}
                  onChange={e =>
                    setFormNovoCurriculo({
                      ...formNovoCurriculo,
                      cidade: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!formNovoCurriculo.estado || loadingCidades}
                  required
                >
                  <option value="">
                    {loadingCidades
                      ? 'Carregando...'
                      : !formNovoCurriculo.estado
                        ? 'Selecione o estado primeiro'
                        : 'Selecione a cidade'}
                  </option>
                  {cidadesDisponiveis.map(cidade => (
                    <option key={cidade} value={cidade}>
                      {cidade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formNovoCurriculo.email}
                onChange={e =>
                  setFormNovoCurriculo({
                    ...formNovoCurriculo,
                    email: e.target.value,
                  })
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formNovoCurriculo.endereco}
                onChange={e =>
                  setFormNovoCurriculo({
                    ...formNovoCurriculo,
                    endereco: e.target.value,
                  })
                }
                placeholder="Endereço completo"
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formNovoCurriculo.observacoes}
                onChange={e =>
                  setFormNovoCurriculo({
                    ...formNovoCurriculo,
                    observacoes: e.target.value,
                  })
                }
                placeholder="Observações sobre o currículo"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNovoCurriculoDialogOpen(false);
                setFormNovoCurriculo({
                  nome: '',
                  sobrenome: '',
                  telefone: '',
                  estado: '',
                  cidade: '',
                  email: '',
                  endereco: '',
                  observacoes: '',
                });
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleNovoCurriculo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o currículo de{' '}
              <strong>
                {curriculoToDelete?.nome} {curriculoToDelete?.sobrenome}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCurriculoToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de compartilhamento */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartilhar currículos</DialogTitle>
            <DialogDescription>
              Selecione as cidades cujos currículos você deseja reunir em um
              pacote ZIP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {shareOptions.map(option => {
              const checked = selectedShareCities.includes(option.key);
              return (
                <label
                  key={option.key}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleShareCity(option.key)}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {option.count}{' '}
                        {option.count === 1 ? 'currículo' : 'currículos'}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
            {shareOptions.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma cidade disponível no momento.
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShareDialogOpen(false);
                setSelectedShareCities([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleShareCurriculos}
              disabled={generatingShare || selectedShareCities.length === 0}
            >
              {generatingShare ? 'Gerando...' : 'Gerar pacote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Vinculação de Unidade */}
      <Dialog
        open={vinculacaoDialogOpen}
        onOpenChange={setVinculacaoDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Candidatura a Unidade</DialogTitle>
            <DialogDescription>
              {curriculoParaVincular && (
                <>
                  Vincular{' '}
                  <strong>
                    {curriculoParaVincular.nome}{' '}
                    {curriculoParaVincular.sobrenome}
                  </strong>{' '}
                  a uma unidade existente.
                  {(() => {
                    const origemDados = curriculoParaVincular.origemId
                      ? (curriculoParaVincular as any).origemDados
                      : null;
                    const cidadeInfo = origemDados?.cidadeInformada;
                    const estadoInfo = origemDados?.estadoInformado;
                    return cidadeInfo ? (
                      <p className="mt-2 text-sm text-orange-700">
                        Cidade informada no Indeed:{' '}
                        <strong>{cidadeInfo}</strong>, {estadoInfo}
                      </p>
                    ) : null;
                  })()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="unidade-vincular">Selecione a Unidade</Label>
              <select
                id="unidade-vincular"
                value={unidadeSelecionada}
                onChange={e => setUnidadeSelecionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
              >
                <option value="">Selecione uma unidade...</option>
                {unidades
                  .filter(
                    u =>
                      u.ativa !== false &&
                      u.nome !== 'PENDENTE - VINCULAÇÃO MANUAL'
                  )
                  .sort((a, b) => {
                    const nomeA = a.nome || '';
                    const nomeB = b.nome || '';
                    return nomeA.localeCompare(nomeB);
                  })
                  .map(unidade => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}{' '}
                      {unidade.cidade && unidade.estado
                        ? `(${unidade.cidade}, ${unidade.estado})`
                        : ''}
                    </option>
                  ))}
              </select>
            </div>
            {!unidadeSelecionada && (
              <p className="text-sm text-gray-500">
                Se a cidade informada não corresponder a nenhuma unidade, você
                pode criar uma nova unidade em Configurações → Unidades.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVinculacaoDialogOpen(false);
                setCurriculoParaVincular(null);
                setUnidadeSelecionada('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!curriculoParaVincular || !unidadeSelecionada) {
                  toast.error('Selecione uma unidade');
                  return;
                }
                setVinculando(true);
                try {
                  const response = await fetch(
                    `/api/curriculos/${curriculoParaVincular.id}`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ unidadeId: unidadeSelecionada }),
                    }
                  );
                  const result = await response.json();
                  if (!response.ok) {
                    throw new Error(result.error || 'Erro ao vincular unidade');
                  }
                  toast.success('Candidatura vinculada com sucesso!');
                  setVinculacaoDialogOpen(false);
                  setCurriculoParaVincular(null);
                  setUnidadeSelecionada('');
                  fetchData();
                } catch (error: any) {
                  toast.error(error.message || 'Erro ao vincular unidade');
                } finally {
                  setVinculando(false);
                }
              }}
              disabled={vinculando || !unidadeSelecionada}
            >
              {vinculando ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
