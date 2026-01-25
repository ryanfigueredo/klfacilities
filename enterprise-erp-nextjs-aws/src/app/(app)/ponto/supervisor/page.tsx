'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Download,
  Search,
  Calendar,
  Building2,
  Users,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  FileDown,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Unidade = {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  ativa?: boolean;
};

type Funcionario = {
  id: string;
  nome: string;
  cpf: string | null;
  diaFolga: number | null;
  grupoId?: string | null;
  unidadeId: string | null;
  unidadeNome?: string | null;
  unidade?: {
    id: string;
    nome: string;
  };
  grupo?:
    | {
        id: string;
        nome: string;
      }
    | string;
  batidas?: {
    total: number;
    entrada: number;
    saida: number;
    intervaloInicio: number;
    intervaloFim: number;
  };
};

type Grupo = {
  id: string;
  nome: string;
};

type Supervisor = {
  id: string;
  name: string;
  email: string;
  role: string;
  grupos: string[];
  unidades: string[];
};

type FolhaData = {
  dia: number;
  semana: string;
  normalInicio?: string;
  normalTermino?: string;
  normalIntervalo?: string;
  normalVoltaIntervalo?: string;
  totalHoras?: string;
  totalMinutos: number;
  pontos: Array<{
    id: string;
    tipo: string;
    timestamp: string;
    funcionarioId?: string;
    criadoPorId?: string | null;
    observacao?: string | null;
  }>;
};

type KPIData = {
  totalHoras: number;
  totalMinutos: number;
  totalRegistros: number;
  colaboradoresAtivos: number;
  unidadesAtivas: number;
};

export default function PontoSupervisorPage() {
  const ALL = 'all';
  const { data: session } = useSession();
  const canEdit =
    session?.user?.role === 'SUPERVISOR' ||
    session?.user?.role === 'ADMIN' ||
    session?.user?.role === 'MASTER' ||
    session?.user?.role === 'OPERACIONAL' ||
    session?.user?.role === 'RH';

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>(ALL);
  const [selectedCidade, setSelectedCidade] = useState<string>(ALL);
  const [selectedEstado, setSelectedEstado] = useState<string>(ALL);
  const [selectedGrupo, setSelectedGrupo] = useState<string>(ALL);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>(ALL);
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [apenasComRegistros, setApenasComRegistros] = useState(false);
  const [folhaData, setFolhaData] = useState<FolhaData[]>([]);
  const [funcionarioInfo, setFuncionarioInfo] = useState<any>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [exportingGrupo, setExportingGrupo] = useState(false);
  const [funcionariosComRegistros, setFuncionariosComRegistros] = useState<
    Set<string>
  >(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pontoEditando, setPontoEditando] = useState<{
    id: string;
    tipo: string;
    timestamp: string;
    criadoPorId?: string | null;
  } | null>(null);
  const [dataPontoEdit, setDataPontoEdit] = useState('');
  const [horaPontoEdit, setHoraPontoEdit] = useState('');
  const [observacaoEdit, setObservacaoEdit] = useState('');
  const [observacaoAdicionar, setObservacaoAdicionar] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(() => {
    // Carregar unidades
    fetch('/api/unidades')
      .then(r => r.json())
      .then(j => {
        const data = j?.data || j?.rows || j;
        setUnidades(
          Array.isArray(data) ? data.filter((u: any) => u.ativa !== false) : []
        );
      })
      .catch(() => setUnidades([]));

    // Carregar funcionários
    fetch('/api/funcionarios')
      .then(r => r.json())
      .then(j => {
        const data = j?.rows || j?.data || j;
        setFuncionarios(Array.isArray(data) ? data : []);
      })
      .catch(() => setFuncionarios([]));

    // Carregar grupos
    fetch('/api/grupos')
      .then(r => r.json())
      .then(j => {
        const data = j?.data || j?.rows || j;
        setGrupos(Array.isArray(data) ? data : []);
      })
      .catch(() => setGrupos([]));

    // Carregar supervisores
    fetch('/api/supervisores')
      .then(r => r.json())
      .then(j => {
        setSupervisores(Array.isArray(j) ? j : []);
      })
      .catch(() => setSupervisores([]));
  }, []);

  // Obter cidades e estados únicos das unidades
  const cidades = useMemo(() => {
    return Array.from(
      new Set(unidades.filter(u => u.cidade).map(u => u.cidade!))
    ).sort();
  }, [unidades]);

  const estados = useMemo(() => {
    return Array.from(
      new Set(unidades.filter(u => u.estado).map(u => u.estado!))
    ).sort();
  }, [unidades]);

  const carregarKPIs = async () => {
    setLoadingKpis(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedUnidade !== ALL) params.append('unidadeId', selectedUnidade);
      if (selectedCidade !== ALL) params.append('cidade', selectedCidade);
      if (selectedEstado !== ALL) params.append('estado', selectedEstado);
      if (selectedGrupo !== ALL) params.append('grupoId', selectedGrupo);
      if (selectedSupervisor !== ALL)
        params.append('supervisorId', selectedSupervisor);
      if (selectedFuncionario)
        params.append('funcionarioId', selectedFuncionario);

      const response = await fetch(`/api/ponto/kpis?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result) {
        setKpiData(result);
      } else {
        setKpiData(null);
      }
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
      setKpiData(null);
    } finally {
      setLoadingKpis(false);
    }
  };

  const carregarFolha = async () => {
    // Se não há funcionário selecionado, não carregar folha individual
    if (!selectedFuncionario) {
      setFolhaData([]);
      setFuncionarioInfo(null);
      setProtocolo(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        funcionarioId: selectedFuncionario,
      });
      if (selectedUnidade !== ALL) {
        params.append('unidadeId', selectedUnidade);
      }

      const response = await fetch(`/api/ponto/folha?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Erro ao carregar folha de ponto' };
        }
        throw new Error(errorData.error || 'Erro ao carregar folha de ponto');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta não é JSON válido');
      }

      const result = await response.json();

      if (result.table) {
        setFolhaData(result.table);
        setFuncionarioInfo(result.funcionario);
        setProtocolo(result.protocolo || null);
        if (result.table.length === 0) {
          // Não mostrar toast quando não há registros - é normal para folhas em branco
        }
      } else {
        console.error('Erro ao carregar folha:', result);
        toast.error(result.error || 'Erro ao carregar folha de ponto');
        setFolhaData([]);
        setFuncionarioInfo(null);
        setProtocolo(null);
      }
    } catch (error) {
      console.error('Erro ao carregar folha:', error);
      setFolhaData([]);
      setFuncionarioInfo(null);
      setProtocolo(null);
    } finally {
      setLoading(false);
    }
  };

  // Carregar funcionários com registros no período
  const carregarFuncionariosComRegistros = async () => {
    if (!apenasComRegistros) {
      setFuncionariosComRegistros(new Set());
      return;
    }

    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedUnidade !== ALL) params.append('unidadeId', selectedUnidade);
      if (selectedCidade !== ALL) params.append('cidade', selectedCidade);
      if (selectedEstado !== ALL) params.append('estado', selectedEstado);
      if (selectedGrupo !== ALL) params.append('grupoId', selectedGrupo);
      if (selectedSupervisor !== ALL)
        params.append('supervisorId', selectedSupervisor);

      const response = await fetch(`/api/ponto/registros?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result?.ok && result?.data) {
        // Extrair IDs únicos de funcionários que têm registros
        const funcionariosIds = new Set<string>(
          result.data
            .map((r: any) => r.funcionarioId)
            .filter((id: any): id is string => Boolean(id))
        );
        setFuncionariosComRegistros(funcionariosIds);
      } else {
        setFuncionariosComRegistros(new Set());
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários com registros:', error);
      setFuncionariosComRegistros(new Set());
    }
  };

  // Carregar KPIs
  useEffect(() => {
    carregarKPIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMonth,
    selectedUnidade,
    selectedCidade,
    selectedEstado,
    selectedGrupo,
    selectedSupervisor,
    selectedFuncionario,
  ]);

  // Carregar funcionários com registros quando filtro mudar
  useEffect(() => {
    carregarFuncionariosComRegistros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apenasComRegistros,
    selectedMonth,
    selectedUnidade,
    selectedCidade,
    selectedEstado,
    selectedGrupo,
    selectedSupervisor,
  ]);

  useEffect(() => {
    carregarFolha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFuncionario, selectedMonth, selectedUnidade]);

  // Filtrar unidades baseado em cidade e estado
  const unidadesFiltradas = useMemo(() => {
    if (!Array.isArray(unidades)) return [];
    return unidades.filter(u => {
      if (!u) return false;
      const matchCidade = selectedCidade === ALL || u.cidade === selectedCidade;
      const matchEstado = selectedEstado === ALL || u.estado === selectedEstado;
      return matchCidade && matchEstado;
    });
  }, [unidades, selectedCidade, selectedEstado]);

  // Obter unidades do supervisor selecionado
  const unidadesDoSupervisor = useMemo(() => {
    if (selectedSupervisor === ALL) return null;
    const supervisor = supervisores.find(s => s.id === selectedSupervisor);
    if (!supervisor) return null;
    // Buscar IDs das unidades do supervisor através dos nomes
    return unidades
      .filter(u => supervisor.unidades.includes(u.nome))
      .map(u => u.id);
  }, [selectedSupervisor, supervisores, unidades]);

  // Filtrar funcionários
  const funcionariosFiltrados = useMemo(() => {
    if (!Array.isArray(funcionarios)) return [];
    return funcionarios.filter(f => {
      if (!f || !f.nome) return false;
      try {
        const matchSearch =
          !searchTerm ||
          f.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchUnidade =
          selectedUnidade === ALL || f.unidadeId === selectedUnidade;
        const unidade = unidades.find(u => u?.id === f.unidadeId);
        const matchCidade =
          selectedCidade === ALL || unidade?.cidade === selectedCidade;
        const matchEstado =
          selectedEstado === ALL || unidade?.estado === selectedEstado;
        const matchGrupo =
          selectedGrupo === ALL || (f as any).grupoId === selectedGrupo;
        // Filtrar por supervisor: se um supervisor foi selecionado, apenas funcionários das unidades dele
        const matchSupervisor =
          selectedSupervisor === ALL ||
          !unidadesDoSupervisor ||
          unidadesDoSupervisor.includes(f.unidadeId || '');
        // Filtrar por colaboradores com registros se o filtro estiver ativo
        const matchComRegistros =
          !apenasComRegistros || funcionariosComRegistros.has(f.id);
        return (
          matchSearch &&
          matchUnidade &&
          matchCidade &&
          matchEstado &&
          matchGrupo &&
          matchSupervisor &&
          matchComRegistros
        );
      } catch (error) {
        console.error('Erro ao filtrar funcionário:', error, f);
        return false;
      }
    });
  }, [
    funcionarios,
    searchTerm,
    selectedUnidade,
    selectedCidade,
    selectedEstado,
    selectedGrupo,
    selectedSupervisor,
    unidadesDoSupervisor,
    unidades,
    apenasComRegistros,
    funcionariosComRegistros,
  ]);

  // Resetar filtros dependentes
  useEffect(() => {
    const hasCidade = selectedCidade !== ALL;
    const hasEstado = selectedEstado !== ALL;

    if (hasCidade || hasEstado) {
      // Se mudou cidade/estado, limpar unidade selecionada se não corresponder
      if (selectedUnidade !== ALL) {
        const unidade = unidades.find(u => u.id === selectedUnidade);
        if (unidade) {
          if (
            (hasCidade && unidade.cidade !== selectedCidade) ||
            (hasEstado && unidade.estado !== selectedEstado)
          ) {
            setSelectedUnidade(ALL);
          }
        }
      }
    }
  }, [selectedCidade, selectedEstado, selectedUnidade, unidades]);

  const formatarHora = (horas: number, minutos: number) => {
    const h = Math.floor(horas);
    const m = Math.floor(minutos);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const calcularTotalMes = () => {
    const totalMinutos = folhaData.reduce(
      (sum, row) => sum + row.totalMinutos,
      0
    );
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return { horas, minutos, totalMinutos };
  };

  const exportarFolha = () => {
    if (!funcionarioInfo || folhaData.length === 0) return;

    const total = calcularTotalMes();
    const mesAno = selectedMonth.split('-');
    const mesNome = new Date(
      parseInt(mesAno[0]),
      parseInt(mesAno[1]) - 1
    ).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    let csv = `Folha de Ponto - ${funcionarioInfo.nome}\n`;
    csv += `Período: ${mesNome}\n`;
    csv += `Grupo: ${funcionarioInfo.grupo?.nome || 'N/A'}\n`;
    csv += `Unidade: ${funcionarioInfo.unidade?.nome || 'N/A'}\n\n`;
    csv += `Dia,Semana,Entrada,Saída,Intervalo Início,Intervalo Fim,Total Horas\n`;

    folhaData.forEach(row => {
      csv += `${row.dia},${row.semana},${row.normalInicio || ''},${row.normalTermino || ''},${row.normalIntervalo || ''},${row.normalVoltaIntervalo || ''},${row.totalHoras || ''}\n`;
    });

    csv += `\nTotal do Mês: ${formatarHora(total.horas, total.minutos)} (${total.horas}h ${total.minutos}min)\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `folha-ponto-${funcionarioInfo.nome.replace(/\s+/g, '-')}-${selectedMonth}.csv`;
    link.click();
  };

  const formatarHoras = (horas: number, minutos: number) => {
    return `${horas}h ${minutos}min`;
  };

  const handleEditarPonto = (ponto: {
    id: string;
    tipo: string;
    timestamp: string;
    criadoPorId?: string | null;
  }) => {
    // Verificar se o ponto foi batido pelo funcionário (criadoPorId null)
    // Se foi batido pelo funcionário, não permitir edição
    if (!ponto.criadoPorId) {
      toast.error(
        'Não é possível editar pontos que foram batidos pelo funcionário. Apenas pontos adicionados manualmente podem ser editados.'
      );
      return;
    }

    try {
      const data = new Date(ponto.timestamp);
      if (isNaN(data.getTime())) {
        toast.error('Data/hora inválida no registro de ponto');
        return;
      }
      setPontoEditando(ponto);
      setDataPontoEdit(format(data, 'yyyy-MM-dd'));
      setHoraPontoEdit(format(data, 'HH:mm'));
      setObservacaoEdit('');
      setEditDialogOpen(true);
    } catch (error) {
      console.error('Erro ao processar data do ponto:', error);
      toast.error('Erro ao processar data do ponto');
    }
  };

  const handleSalvarEdicao = async () => {
    if (!pontoEditando) return;

    if (!observacaoEdit.trim()) {
      toast.error('É obrigatório informar o motivo da edição');
      return;
    }

    setSalvandoEdicao(true);
    try {
      const timestamp = new Date(`${dataPontoEdit}T${horaPontoEdit}:00`);

      if (isNaN(timestamp.getTime())) {
        throw new Error('Data/hora inválida');
      }

      const res = await fetch('/api/ponto/supervisor/editar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registroPontoId: pontoEditando.id,
          timestamp: timestamp.toISOString(),
          observacao: observacaoEdit.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao editar ponto');
      }

      toast.success('Ponto editado com sucesso!');
      setEditDialogOpen(false);
      setPontoEditando(null);
      setObservacaoEdit('');
      carregarFolha();
    } catch (error) {
      console.error('Erro ao editar ponto:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao editar ponto'
      );
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleExcluirPonto = async (pontoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro de ponto?')) {
      return;
    }

    try {
      const res = await fetch(`/api/ponto/supervisor/editar?id=${pontoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao excluir ponto');
      }

      toast.success('Ponto excluído com sucesso!');
      carregarFolha();
    } catch (error) {
      console.error('Erro ao excluir ponto:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao excluir ponto'
      );
    }
  };

  const getTipoNome = (tipo: string): string => {
    const tipos: Record<string, string> = {
      ENTRADA: 'Entrada',
      SAIDA: 'Saída',
      INTERVALO_INICIO: 'Intervalo - Início',
      INTERVALO_FIM: 'Intervalo - Fim',
      HORA_EXTRA_INICIO: 'Hora Extra - Início',
      HORA_EXTRA_FIM: 'Hora Extra - Fim',
    };
    return tipos[tipo] || tipo;
  };

  const exportarGrupoPDF = async () => {
    if (selectedGrupo === ALL || !selectedMonth) {
      toast.error('Selecione um grupo e um mês');
      return;
    }

    setExportingGrupo(true);
    try {
      const params = new URLSearchParams({
        grupoId: selectedGrupo,
        month: selectedMonth,
      });

      // Adicionar filtros se selecionados
      if (selectedUnidade !== ALL) {
        params.append('unidadeId', selectedUnidade);
      }
      if (selectedCidade !== ALL) {
        params.append('cidade', selectedCidade);
      }
      if (selectedEstado !== ALL) {
        params.append('estado', selectedEstado);
      }
      if (selectedSupervisor !== ALL) {
        params.append('supervisorId', selectedSupervisor);
      }
      if (apenasComRegistros) {
        params.append('apenasComRegistros', 'true');
      }

      const url = `/api/ponto/folhas-grupo/pdf?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao exportar');
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `folhas-ponto-${grupos.find(g => g.id === selectedGrupo)?.nome || 'grupo'}-${selectedMonth}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar PDF');
    } finally {
      setExportingGrupo(false);
    }
  };

  const exportarGrupoPlanilha = async (formato: 'csv' | 'xlsx') => {
    if (selectedGrupo === ALL || !selectedMonth) {
      toast.error('Selecione um grupo e um mês');
      return;
    }

    setExportingGrupo(true);
    try {
      const params = new URLSearchParams({
        grupoId: selectedGrupo,
        month: selectedMonth,
        formato,
      });

      // Adicionar filtros se selecionados
      if (selectedUnidade !== ALL) {
        params.append('unidadeId', selectedUnidade);
      }
      if (selectedCidade !== ALL) {
        params.append('cidade', selectedCidade);
      }
      if (selectedEstado !== ALL) {
        params.append('estado', selectedEstado);
      }
      if (selectedSupervisor !== ALL) {
        params.append('supervisorId', selectedSupervisor);
      }
      if (apenasComRegistros) {
        params.append('apenasComRegistros', 'true');
      }

      const url = `/api/ponto/folhas-grupo/export?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao exportar');
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `folhas-ponto-${grupos.find(g => g.id === selectedGrupo)?.nome || 'grupo'}-${selectedMonth}.${formato}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar');
    } finally {
      setExportingGrupo(false);
    }
  };

  const getDiaSemanaNome = (dia: number | null): string => {
    if (dia === null) return 'Sem folga';
    const dias = [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ];
    return dias[dia] || 'Sem folga';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Gerenciar Pontos
          </h1>
          <p className="text-gray-600">
            Visualize e gerencie folhas de ponto dos colaboradores por unidade e
            localização
          </p>
        </div>
        <Button onClick={carregarFolha} variant="outline" disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Horas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {formatarHoras(
                      kpiData.totalHoras,
                      kpiData.totalMinutos % 60
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {kpiData.totalMinutos} minutos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Registros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">
                  {kpiData.totalRegistros.toLocaleString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Colaboradores Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <p className="text-2xl font-bold">
                  {kpiData.colaboradoresAtivos}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Unidades Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">{kpiData.unidadesAtivas}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Média por Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <p className="text-2xl font-bold">
                  {kpiData.colaboradoresAtivos > 0
                    ? formatarHoras(
                        Math.floor(
                          kpiData.totalMinutos /
                            kpiData.colaboradoresAtivos /
                            60
                        ),
                        Math.floor(
                          (kpiData.totalMinutos / kpiData.colaboradoresAtivos) %
                            60
                        )
                      )
                    : '0h 0min'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Busca
          </CardTitle>
          <CardDescription>
            Filtre por localização, unidade e colaborador para visualizar folhas
            de ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <Label htmlFor="grupo">Grupo</Label>
              <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                <SelectTrigger id="grupo">
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os grupos</SelectItem>
                  {grupos.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="supervisor">Supervisor</Label>
              <Select
                value={selectedSupervisor}
                onValueChange={setSelectedSupervisor}
              >
                <SelectTrigger id="supervisor">
                  <SelectValue placeholder="Todos os supervisores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os supervisores</SelectItem>
                  {supervisores.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="estado">Estado</Label>
              <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Todos os estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os estados</SelectItem>
                  {estados.map(estado => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="cidade">Cidade</Label>
              <Select value={selectedCidade} onValueChange={setSelectedCidade}>
                <SelectTrigger id="cidade">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as cidades</SelectItem>
                  {cidades
                    .filter(
                      cidade =>
                        selectedEstado === ALL ||
                        unidades.find(u => u.cidade === cidade)?.estado ===
                          selectedEstado
                    )
                    .map(cidade => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="unidade">Unidade</Label>
              <Select
                value={selectedUnidade}
                onValueChange={setSelectedUnidade}
              >
                <SelectTrigger id="unidade">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as unidades</SelectItem>
                  {unidadesFiltradas.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="month">Mês/Ano</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="apenasComRegistros">Colaboradores</Label>
              <Select
                value={apenasComRegistros ? 'com-registros' : 'todos'}
                onValueChange={value =>
                  setApenasComRegistros(value === 'com-registros')
                }
              >
                <SelectTrigger id="apenasComRegistros">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com-registros">
                    Apenas com registros
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Mostrar apenas colaboradores que têm registros no período
              </p>
            </div>

            <div className="lg:col-span-2">
              <Label htmlFor="funcionario">Colaborador</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="funcionario"
                    placeholder="Buscar colaborador..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {funcionariosFiltrados.length > 0 && (
                  <Select
                    value={selectedFuncionario}
                    onValueChange={setSelectedFuncionario}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {funcionariosFiltrados.slice(0, 100).map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome} {f.unidadeNome ? `- ${f.unidadeNome}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 flex justify-end">
              <Button
                onClick={carregarFolha}
                disabled={!selectedFuncionario || loading}
                className="w-full md:w-auto"
              >
                {loading
                  ? 'Carregando...'
                  : selectedFuncionario
                    ? 'Carregar Folha'
                    : 'Selecione um colaborador'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exportação em Massa por Grupo */}
      {selectedGrupo !== ALL && selectedMonth && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <FileDown className="h-5 w-5" />
              Exportação em Massa -{' '}
              {grupos.find(g => g.id === selectedGrupo)?.nome}
            </CardTitle>
            <CardDescription>
              Exporte as folhas de ponto dos colaboradores deste grupo para o mês selecionado.
              {selectedUnidade !== ALL || selectedCidade !== ALL || selectedEstado !== ALL || selectedSupervisor !== ALL || apenasComRegistros ? (
                <span className="block mt-1 font-medium text-blue-700">
                  Filtros aplicados: {[
                    selectedUnidade !== ALL && 'Unidade',
                    selectedCidade !== ALL && 'Cidade',
                    selectedEstado !== ALL && 'Estado',
                    selectedSupervisor !== ALL && 'Supervisor',
                    apenasComRegistros && 'Apenas com registros'
                  ].filter(Boolean).join(', ')}
                </span>
              ) : (
                ' A exportação seguirá os filtros selecionados acima.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={exportarGrupoPDF}
                disabled={exportingGrupo}
                variant="default"
                className="bg-red-600 hover:bg-red-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                {exportingGrupo ? 'Gerando PDF...' : 'Exportar PDF'}
              </Button>
              <Button
                onClick={() => exportarGrupoPlanilha('xlsx')}
                disabled={exportingGrupo}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {exportingGrupo ? 'Gerando Excel...' : 'Exportar Excel'}
              </Button>
              <Button
                onClick={() => exportarGrupoPlanilha('csv')}
                disabled={exportingGrupo}
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {exportingGrupo ? 'Gerando CSV...' : 'Exportar CSV'}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Esta operação pode levar alguns minutos dependendo do número de
              colaboradores e registros.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Informações do Funcionário */}
      {funcionarioInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Informações do Colaborador
              </CardTitle>
              <Button
                onClick={() => {
                  if (!funcionarioInfo) {
                    toast.error('Informações do funcionário não encontradas');
                    return;
                  }
                  const params = new URLSearchParams({
                    month: selectedMonth,
                    formato: 'pdf',
                  });

                  if (funcionarioInfo.cpf) {
                    const cpfClean = funcionarioInfo.cpf.replace(/\D/g, '');
                    if (cpfClean.length === 11) {
                      params.append('cpf', cpfClean);
                    } else {
                      params.append('funcionarioId', funcionarioInfo.id);
                    }
                  } else {
                    params.append('funcionarioId', funcionarioInfo.id);
                  }

                  if (selectedUnidade !== ALL) {
                    params.append('unidadeId', selectedUnidade);
                  }
                  const url = `/api/ponto/folha?${params.toString()}`;
                  window.open(url, '_blank');
                }}
                variant="default"
                className="bg-red-600 hover:bg-red-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Nome</Label>
                <p className="font-semibold">{funcionarioInfo.nome}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Grupo</Label>
                <p className="font-semibold">
                  {funcionarioInfo.grupo?.nome || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Unidade</Label>
                <p className="font-semibold">
                  {funcionarioInfo.unidade?.nome || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">CPF</Label>
                <p className="font-semibold">
                  {funcionarioInfo.cpf
                    ? funcionarioInfo.cpf.replace(
                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                        '$1.$2.$3-$4'
                      )
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Protocolo</Label>
                {protocolo ? (
                  <div className="flex items-center gap-2">
                    <p className="font-semibold font-mono text-blue-600">
                      {protocolo}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        window.open(
                          `/operacional/ponto/protocolo?proto=${encodeURIComponent(protocolo)}`,
                          '_blank'
                        );
                      }}
                      title="Ver protocolo com fotos"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Ver Fotos
                    </Button>
                  </div>
                ) : (
                  <p className="font-semibold text-gray-400">N/A</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folha de Ponto */}
      {selectedFuncionario && funcionarioInfo && folhaData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Folha de Ponto
                </CardTitle>
                <CardDescription>
                  {(() => {
                    const [ano, mes] = selectedMonth.split('-').map(Number);
                    const data = new Date(ano, mes - 1, 1);
                    return data.toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    });
                  })()}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!funcionarioInfo) {
                      toast.error('Informações do funcionário não encontradas');
                      return;
                    }
                    const params = new URLSearchParams({
                      month: selectedMonth,
                      formato: 'pdf', // Solicitar PDF explicitamente
                    });

                    // Tentar usar CPF se disponível, senão usar funcionarioId
                    if (funcionarioInfo.cpf) {
                      const cpfClean = funcionarioInfo.cpf.replace(/\D/g, '');
                      if (cpfClean.length === 11) {
                        params.append('cpf', cpfClean);
                      } else {
                        // Se CPF inválido, usar funcionarioId
                        params.append('funcionarioId', funcionarioInfo.id);
                      }
                    } else {
                      // Se não tem CPF, usar funcionarioId
                      params.append('funcionarioId', funcionarioInfo.id);
                    }

                    if (selectedUnidade !== ALL) {
                      params.append('unidadeId', selectedUnidade);
                    }
                    const url = `/api/ponto/folha?${params.toString()}`;
                    window.open(url, '_blank');
                  }}
                  variant="default"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button onClick={exportarFolha} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Semana</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Intervalo Início</TableHead>
                    <TableHead>Intervalo Fim</TableHead>
                    <TableHead>Total Horas</TableHead>
                    <TableHead>Observações</TableHead>
                    {canEdit && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folhaData.map((row, idx) => {
                    // Verificar se é dia de folga
                    const diaFolga = funcionarioInfo?.diaFolga;
                    const isDiaFolga =
                      diaFolga !== null && diaFolga !== undefined;
                    const diaSemana = new Date(
                      parseInt(selectedMonth.split('-')[0]),
                      parseInt(selectedMonth.split('-')[1]) - 1,
                      row.dia
                    ).getDay();
                    const isFolga = isDiaFolga && diaSemana === diaFolga;

                    // Verificar se o dia não tem horários mas tem pontos (adicionados pelo supervisor)
                    const temPontos = row.pontos && row.pontos.length > 0;
                    const semHorarios =
                      !row.normalInicio &&
                      !row.normalTermino &&
                      !row.normalIntervalo &&
                      !row.normalVoltaIntervalo;
                    const isDiaAdicionadoSupervisor = temPontos && semHorarios;

                    // Verificar se há pontos batidos pelo funcionário (criadoPorId null)
                    // Esses pontos não podem ser editados
                    const pontosBatidosFuncionario =
                      row.pontos?.some(p => !p.criadoPorId) || false;

                    return (
                      <TableRow
                        key={idx}
                        className={cn(
                          isFolga && 'bg-blue-50',
                          isDiaAdicionadoSupervisor && 'bg-amber-50',
                          pontosBatidosFuncionario && 'bg-blue-50/50'
                        )}
                      >
                        <TableCell
                          className={cn(
                            'font-medium',
                            isFolga && 'text-blue-700',
                            isDiaAdicionadoSupervisor && 'text-amber-700',
                            pontosBatidosFuncionario && 'text-blue-600'
                          )}
                        >
                          {row.dia}
                          {isFolga && (
                            <span className="ml-2 text-xs">(Folga)</span>
                          )}
                          {isDiaAdicionadoSupervisor && (
                            <span className="ml-2 text-xs">(Adicionado)</span>
                          )}
                          {pontosBatidosFuncionario && (
                            <span className="ml-2 text-xs text-blue-600">
                              (Batido pelo funcionário)
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            isFolga && 'text-blue-700',
                            isDiaAdicionadoSupervisor && 'text-amber-700'
                          )}
                        >
                          {row.semana}
                        </TableCell>
                        <TableCell
                          className={cn(
                            isFolga && 'text-blue-600',
                            isDiaAdicionadoSupervisor && 'text-amber-600'
                          )}
                        >
                          {row.normalInicio || '—'}
                          {canEdit &&
                            row.pontos?.find(p => p.tipo === 'ENTRADA') &&
                            (() => {
                              const pontoEntrada = row.pontos.find(
                                p => p.tipo === 'ENTRADA'
                              )!;
                              // Só mostrar botões se foi adicionado pelo supervisor (criadoPorId não null)
                              if (!pontoEntrada.criadoPorId) return null;
                              return (
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                      handleEditarPonto(pontoEntrada)
                                    }
                                    title="Editar entrada"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() =>
                                      handleExcluirPonto(pontoEntrada.id)
                                    }
                                    title="Excluir entrada"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })()}
                        </TableCell>
                        <TableCell
                          className={cn(
                            isFolga && 'text-blue-600',
                            isDiaAdicionadoSupervisor && 'text-amber-600'
                          )}
                        >
                          {row.normalTermino || '—'}
                          {canEdit &&
                            row.pontos?.find(p => p.tipo === 'SAIDA') &&
                            (() => {
                              const pontoSaida = row.pontos.find(
                                p => p.tipo === 'SAIDA'
                              )!;
                              if (!pontoSaida.criadoPorId) return null;
                              return (
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                      handleEditarPonto(pontoSaida)
                                    }
                                    title="Editar saída"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() =>
                                      handleExcluirPonto(pontoSaida.id)
                                    }
                                    title="Excluir saída"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })()}
                        </TableCell>
                        <TableCell
                          className={cn(
                            isFolga && 'text-blue-600',
                            isDiaAdicionadoSupervisor && 'text-amber-600'
                          )}
                        >
                          {(() => {
                            const pontoIntervaloInicio = row.pontos?.find(
                              p => p.tipo === 'INTERVALO_INICIO'
                            );
                            const isAvisoSupervisor =
                              pontoIntervaloInicio?.id?.startsWith(
                                'virtual_aviso_'
                              ) ||
                              pontoIntervaloInicio?.observacao?.includes(
                                'Supervisor'
                              );

                            return (
                              <>
                                {row.normalIntervalo ? (
                                  <span
                                    className={cn(
                                      isAvisoSupervisor &&
                                        'text-red-600 font-bold'
                                    )}
                                  >
                                    {row.normalIntervalo}
                                    {isAvisoSupervisor && (
                                      <span
                                        className="ml-1 text-xs"
                                        title={
                                          pontoIntervaloInicio?.observacao || ''
                                        }
                                      >
                                        🚨
                                      </span>
                                    )}
                                  </span>
                                ) : row.pontos?.some(
                                    p => p.tipo === 'INTERVALO_FIM'
                                  ) && !pontoIntervaloInicio ? (
                                  <span className="text-red-600 font-bold">
                                    —{' '}
                                    <span className="text-xs">🚨 FALTANDO</span>
                                  </span>
                                ) : (
                                  '—'
                                )}
                                {canEdit &&
                                  (() => {
                                    // Se tem intervalo fim mas não tem início, mostrar aviso e botão para adicionar
                                    const temIntervaloFim = row.pontos?.some(
                                      p => p.tipo === 'INTERVALO_FIM'
                                    );
                                    if (
                                      temIntervaloFim &&
                                      !pontoIntervaloInicio
                                    ) {
                                      return (
                                        <div className="mt-1">
                                          <div className="text-xs text-red-600 font-bold mb-1">
                                            🚨 Intervalo início não registrado!
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-red-500 text-red-600 hover:bg-red-50"
                                            onClick={() => {
                                              const funcionarioId =
                                                funcionarioInfo?.id;
                                              if (!funcionarioId) {
                                                toast.error(
                                                  'Funcionário não encontrado'
                                                );
                                                return;
                                              }
                                              // Usar o horário do intervalo fim como referência, mas supervisor deve ajustar
                                              const pontoIntervaloFim =
                                                row.pontos?.find(
                                                  p =>
                                                    p.tipo === 'INTERVALO_FIM'
                                                );
                                              if (pontoIntervaloFim) {
                                                const dataFim = new Date(
                                                  pontoIntervaloFim.timestamp
                                                );
                                                // Sugerir 1h antes como ponto de partida, mas supervisor deve confirmar
                                                const dataInicio = new Date(
                                                  dataFim.getTime() -
                                                    60 * 60 * 1000
                                                );
                                                setDataPontoEdit(
                                                  format(
                                                    dataInicio,
                                                    'yyyy-MM-dd'
                                                  )
                                                );
                                                setHoraPontoEdit(
                                                  format(dataInicio, 'HH:mm')
                                                );
                                                setObservacaoAdicionar(
                                                  'Intervalo início adicionado manualmente pelo supervisor'
                                                );
                                                setPontoEditando({
                                                  id: '',
                                                  tipo: 'INTERVALO_INICIO',
                                                  timestamp:
                                                    dataInicio.toISOString(),
                                                });
                                                setEditDialogOpen(true);
                                              }
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Adicionar Início do Intervalo
                                          </Button>
                                        </div>
                                      );
                                    }
                                    // Não mostrar botões para avisos virtuais
                                    if (isAvisoSupervisor) {
                                      return (
                                        <div className="mt-1 text-xs text-red-600 font-bold">
                                          Adicione o horário correto de início
                                          do intervalo
                                        </div>
                                      );
                                    }
                                    // Só mostrar botões se foi adicionado pelo supervisor (criadoPorId não null)
                                    if (!pontoIntervaloInicio?.criadoPorId)
                                      return null;
                                    return (
                                      <div className="flex gap-1 mt-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() =>
                                            handleEditarPonto(
                                              pontoIntervaloInicio
                                            )
                                          }
                                          title="Editar intervalo início"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-destructive"
                                          onClick={() =>
                                            handleExcluirPonto(
                                              pontoIntervaloInicio.id
                                            )
                                          }
                                          title="Excluir intervalo início"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    );
                                  })()}
                              </>
                            );
                          })()}
                        </TableCell>
                        <TableCell
                          className={cn(
                            isFolga && 'text-blue-600',
                            isDiaAdicionadoSupervisor && 'text-amber-600'
                          )}
                        >
                          {row.normalVoltaIntervalo || '—'}
                          {canEdit &&
                            row.pontos?.find(p => p.tipo === 'INTERVALO_FIM') &&
                            (() => {
                              const pontoIntervaloFim = row.pontos.find(
                                p => p.tipo === 'INTERVALO_FIM'
                              )!;
                              if (!pontoIntervaloFim.criadoPorId) return null;
                              return (
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                      handleEditarPonto(pontoIntervaloFim)
                                    }
                                    title="Editar intervalo fim"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() =>
                                      handleExcluirPonto(pontoIntervaloFim.id)
                                    }
                                    title="Excluir intervalo fim"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })()}
                        </TableCell>
                        <TableCell
                          className={cn(
                            isFolga && 'text-blue-600 font-semibold',
                            isDiaAdicionadoSupervisor &&
                              'text-amber-600 font-semibold'
                          )}
                        >
                          {row.totalHoras || '—'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {(() => {
                            // Coletar todas as observações dos pontos do dia
                            const observacoes =
                              row.pontos
                                ?.filter(
                                  (p: any) =>
                                    p.observacao && p.observacao.trim()
                                )
                                .map((p: any) => ({
                                  texto: p.observacao.trim(),
                                  isAssumido:
                                    p.observacao?.includes(
                                      '⚠️ HORÁRIO ASSUMIDO'
                                    ) || p.id?.startsWith('virtual_'),
                                })) || [];

                            if (observacoes.length === 0) {
                              return <span className="text-gray-400">—</span>;
                            }

                            // Se houver múltiplas observações, juntar com ponto e vírgula
                            const textoObservacoes = observacoes
                              .map(o => o.texto)
                              .join('; ');
                            const temAssumido = observacoes.some(
                              o => o.isAssumido
                            );

                            return (
                              <div
                                className={cn(
                                  'text-sm',
                                  temAssumido
                                    ? 'text-red-600 font-semibold'
                                    : 'text-gray-700'
                                )}
                              >
                                {textoObservacoes.length > 100 ? (
                                  <span title={textoObservacoes}>
                                    {textoObservacoes.substring(0, 100)}...
                                  </span>
                                ) : (
                                  <span>{textoObservacoes}</span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const funcionarioId = funcionarioInfo?.id;
                                if (!funcionarioId) {
                                  toast.error('Funcionário não encontrado');
                                  return;
                                }
                                // Abrir dialog para adicionar ponto neste dia
                                // Garantir que está usando o mês correto do selectedMonth
                                const [ano, mes] = selectedMonth
                                  .split('-')
                                  .map(Number);
                                const dataPonto = new Date(
                                  ano,
                                  mes - 1,
                                  row.dia
                                );
                                setDataPontoEdit(
                                  format(dataPonto, 'yyyy-MM-dd')
                                );
                                setHoraPontoEdit(format(new Date(), 'HH:mm'));
                                setObservacaoAdicionar('');
                                setPontoEditando({
                                  id: '',
                                  tipo: 'ENTRADA',
                                  timestamp: dataPonto.toISOString(),
                                });
                                setEditDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {folhaData.length > 0 && (
                    <TableRow className="font-bold bg-gray-50">
                      <TableCell colSpan={6} className="text-right">
                        Total do Mês:
                      </TableCell>
                      <TableCell>
                        {formatarHora(
                          calcularTotalMes().horas,
                          calcularTotalMes().minutos
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedFuncionario && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Colaboradores
            </CardTitle>
            <CardDescription>
              Selecione um colaborador para visualizar e editar a folha de ponto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {funcionariosFiltrados.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Nenhum colaborador encontrado com os filtros selecionados
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {funcionariosFiltrados.slice(0, 200).map(f => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedFuncionario(f.id);
                      // Carregar folha automaticamente após selecionar
                      setTimeout(() => carregarFolha(), 100);
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{f.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {f.unidadeNome || 'Sem unidade'}{' '}
                        {f.grupo ? `• ${f.grupo}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedFuncionario(f.id);
                        setTimeout(() => carregarFolha(), 100);
                      }}
                    >
                      Ver Folha
                    </Button>
                  </div>
                ))}
                {funcionariosFiltrados.length > 200 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    Mostrando 200 de {funcionariosFiltrados.length}{' '}
                    colaboradores. Use os filtros para refinar a busca.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedFuncionario &&
        funcionarioInfo &&
        folhaData.length === 0 &&
        !loading && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Folha de Ponto - {funcionarioInfo.nome}
                  </CardTitle>
                  <CardDescription>
                    {(() => {
                      const [ano, mes] = selectedMonth.split('-').map(Number);
                      const data = new Date(ano, mes - 1, 1);
                      return data.toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      });
                    })()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (!funcionarioInfo) {
                        toast.error(
                          'Informações do funcionário não encontradas'
                        );
                        return;
                      }
                      const params = new URLSearchParams({
                        month: selectedMonth,
                        formato: 'pdf', // Solicitar PDF explicitamente
                      });

                      // Tentar usar CPF se disponível, senão usar funcionarioId
                      if (funcionarioInfo.cpf) {
                        const cpfClean = funcionarioInfo.cpf.replace(/\D/g, '');
                        if (cpfClean.length === 11) {
                          params.append('cpf', cpfClean);
                        } else {
                          // Se CPF inválido, usar funcionarioId
                          params.append('funcionarioId', funcionarioInfo.id);
                        }
                      } else {
                        // Se não tem CPF, usar funcionarioId
                        params.append('funcionarioId', funcionarioInfo.id);
                      }

                      if (selectedUnidade !== ALL) {
                        params.append('unidadeId', selectedUnidade);
                      }
                      const url = `/api/ponto/folha?${params.toString()}`;
                      window.open(url, '_blank');
                    }}
                    variant="default"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">
                  Nenhum registro de ponto encontrado para este período. A folha
                  será gerada automaticamente quando você adicionar pontos.
                </p>
                {canEdit && (
                  <Button
                    onClick={() => {
                      // Usar o mês selecionado, não o mês atual
                      const [ano, mes] = selectedMonth.split('-').map(Number);
                      const hoje = new Date(ano, mes - 1, new Date().getDate());
                      // Se o dia atual não existe no mês selecionado (ex: 31 de fevereiro), usar o último dia do mês
                      if (hoje.getMonth() !== mes - 1) {
                        hoje.setDate(0); // Vai para o último dia do mês anterior (que é o último dia do mês selecionado)
                      }
                      setDataPontoEdit(format(hoje, 'yyyy-MM-dd'));
                      setHoraPontoEdit(format(new Date(), 'HH:mm'));
                      setObservacaoAdicionar('');
                      setPontoEditando({
                        id: '',
                        tipo: 'ENTRADA',
                        timestamp: hoje.toISOString(),
                      });
                      setEditDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Ponto
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Dialog para editar/adicionar ponto */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pontoEditando?.id ? 'Editar Ponto' : 'Adicionar Ponto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pontoEditando?.id && (
              <div>
                <Label>Tipo de Ponto</Label>
                <Input
                  value={getTipoNome(pontoEditando.tipo)}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
            {!pontoEditando?.id && (
              <div>
                <Label htmlFor="tipo-ponto-edit">Tipo de Ponto</Label>
                <Select
                  value={pontoEditando?.tipo || 'ENTRADA'}
                  onValueChange={v =>
                    setPontoEditando({ ...pontoEditando!, tipo: v })
                  }
                >
                  <SelectTrigger id="tipo-ponto-edit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="SAIDA">Saída</SelectItem>
                    <SelectItem value="INTERVALO_INICIO">
                      Intervalo - Início
                    </SelectItem>
                    <SelectItem value="INTERVALO_FIM">
                      Intervalo - Fim
                    </SelectItem>
                    <SelectItem value="HORA_EXTRA_INICIO">
                      Hora Extra - Início
                    </SelectItem>
                    <SelectItem value="HORA_EXTRA_FIM">
                      Hora Extra - Fim
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data-ponto-edit">Data</Label>
                <Input
                  id="data-ponto-edit"
                  type="date"
                  value={dataPontoEdit}
                  onChange={e => setDataPontoEdit(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="hora-ponto-edit">Hora</Label>
                <Input
                  id="hora-ponto-edit"
                  type="time"
                  value={horaPontoEdit}
                  onChange={e => setHoraPontoEdit(e.target.value)}
                />
              </div>
            </div>
            {pontoEditando?.id && (
              <div>
                <Label htmlFor="observacao-edit">
                  Motivo da Edição <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="observacao-edit"
                  placeholder="Informe o motivo da edição deste ponto..."
                  value={observacaoEdit}
                  onChange={e => setObservacaoEdit(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este campo é obrigatório para registrar o motivo da alteração.
                </p>
              </div>
            )}
            {!pontoEditando?.id && (
              <div>
                <Label htmlFor="observacao-adicionar">
                  Motivo da Adição <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="observacao-adicionar"
                  placeholder="Informe o motivo da adição manual deste ponto..."
                  value={observacaoAdicionar}
                  onChange={e => setObservacaoAdicionar(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este campo é obrigatório para registrar o motivo da adição
                  manual do ponto.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setPontoEditando(null);
                setObservacaoEdit('');
                setObservacaoAdicionar('');
              }}
            >
              Cancelar
            </Button>
            {pontoEditando?.id ? (
              <Button
                onClick={handleSalvarEdicao}
                disabled={salvandoEdicao || !observacaoEdit.trim()}
              >
                {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  if (!pontoEditando || !funcionarioInfo?.id) return;
                  if (!observacaoAdicionar.trim()) {
                    toast.error(
                      'É obrigatório informar o motivo da adição manual do ponto'
                    );
                    return;
                  }
                  setSalvandoEdicao(true);
                  try {
                    const timestamp = new Date(
                      `${dataPontoEdit}T${horaPontoEdit}:00`
                    );
                    const res = await fetch('/api/ponto/supervisor/adicionar', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        funcionarioId: funcionarioInfo.id,
                        tipo: pontoEditando.tipo,
                        timestamp: timestamp.toISOString(),
                        observacao: observacaoAdicionar.trim(),
                      }),
                    });
                    if (!res.ok) {
                      const error = await res.json();
                      throw new Error(error.error || 'Erro ao adicionar ponto');
                    }
                    toast.success('Ponto adicionado com sucesso!');
                    setEditDialogOpen(false);
                    setPontoEditando(null);
                    setObservacaoAdicionar('');
                    // Recarregar folha após adicionar ponto
                    await carregarFolha();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Erro ao adicionar ponto'
                    );
                  } finally {
                    setSalvandoEdicao(false);
                  }
                }}
                disabled={salvandoEdicao || !observacaoAdicionar.trim()}
              >
                {salvandoEdicao ? 'Adicionando...' : 'Adicionar Ponto'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
