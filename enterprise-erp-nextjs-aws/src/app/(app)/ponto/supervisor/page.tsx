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
  Calendar,
  Building2,
  Users,
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

type ViewMode = 'grupos' | 'lojas' | 'funcionarios' | 'historico';

interface GrupoData {
  id: string;
  nome: string;
  funcionarios: Funcionario[];
}

interface LojaData {
  id: string;
  nome: string;
  funcionarios: Funcionario[];
}

export default function PontoSupervisorPage() {
  const { data: session } = useSession();
  const canEdit =
    session?.user?.role === 'SUPERVISOR' ||
    session?.user?.role === 'ADMIN' ||
    session?.user?.role === 'MASTER' ||
    session?.user?.role === 'OPERACIONAL' ||
    session?.user?.role === 'RH';

  const [viewMode, setViewMode] = useState<ViewMode>('grupos');
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [lojaSelecionada, setLojaSelecionada] = useState<string | null>(null);
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loadingFolhas, setLoadingFolhas] = useState(true);
  const [folhaData, setFolhaData] = useState<FolhaData[]>([]);
  const [funcionarioInfo, setFuncionarioInfo] = useState<any>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingGrupo, setExportingGrupo] = useState(false);
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
    setLoadingFolhas(true);
    fetch(`/api/ponto/supervisor/folhas?month=${selectedMonth}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error);
        setFuncionarios(j.funcionarios ?? []);
        setGrupos(j.grupos ?? []);
        setUnidades(j.unidades ?? []);
      })
      .catch(e => {
        console.error(e);
        toast.error('Erro ao carregar dados');
        setFuncionarios([]);
        setGrupos([]);
        setUnidades([]);
      })
      .finally(() => setLoadingFolhas(false));
  }, [selectedMonth]);

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
      if (lojaSelecionada) {
        params.append('unidadeId', lojaSelecionada);
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

  useEffect(() => {
    if (selectedFuncionario && viewMode === 'historico') {
      carregarFolha();
    } else {
      setFolhaData([]);
      setFuncionarioInfo(null);
      setProtocolo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFuncionario, selectedMonth, lojaSelecionada, viewMode]);

  const calcularPontosFaltantes = (f: Funcionario): string[] => {
    const faltantes: string[] = [];
    if (!f.batidas) return ['Sem registros'];
    if (f.batidas.entrada > f.batidas.saida) faltantes.push('Saída');
    if (f.batidas.intervaloInicio > f.batidas.intervaloFim)
      faltantes.push('Fim Intervalo');
    if (f.batidas.intervaloInicio > 0 && f.batidas.entrada === 0)
      faltantes.push('Entrada');
    return faltantes;
  };

  const funcionariosPorGrupo = useMemo((): GrupoData[] => {
    const map = new Map<string, GrupoData>();
    funcionarios.forEach(f => {
      const grupoId = f.grupoId ?? 'sem-grupo';
      const grupoNome =
        grupos.find(g => g.id === grupoId)?.nome ??
        (f as any).grupoNome ??
        'Sem Grupo';
      if (!map.has(grupoId))
        map.set(grupoId, { id: grupoId, nome: grupoNome, funcionarios: [] });
      map.get(grupoId)!.funcionarios.push(f);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [funcionarios, grupos]);

  const funcionariosPorLoja = useMemo((): LojaData[] => {
    if (!grupoSelecionado) return [];
    const grupo = funcionariosPorGrupo.find(g => g.id === grupoSelecionado);
    if (!grupo) return [];
    const map = new Map<string, LojaData>();
    grupo.funcionarios.forEach(f => {
      const lojaId = f.unidadeId ?? 'sem-loja';
      const lojaNome = f.unidadeNome ?? f.unidade?.nome ?? 'Sem Loja';
      if (!map.has(lojaId))
        map.set(lojaId, { id: lojaId, nome: lojaNome, funcionarios: [] });
      map.get(lojaId)!.funcionarios.push(f);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [grupoSelecionado, funcionariosPorGrupo]);

  const funcionariosDaLoja = useMemo((): Funcionario[] => {
    if (!lojaSelecionada) return [];
    const loja = funcionariosPorLoja.find(l => l.id === lojaSelecionada);
    return loja?.funcionarios ?? [];
  }, [lojaSelecionada, funcionariosPorLoja]);

  const handleGrupoPress = (grupoId: string) => {
    setGrupoSelecionado(grupoId);
    setLojaSelecionada(null);
    setSelectedFuncionario('');
    setViewMode('lojas');
  };

  const handleLojaPress = (lojaId: string) => {
    setLojaSelecionada(lojaId);
    setSelectedFuncionario('');
    setViewMode('funcionarios');
  };

  const handleFuncionarioPress = (func: Funcionario) => {
    setSelectedFuncionario(func.id);
    setViewMode('historico');
  };

  const handleBack = () => {
    if (viewMode === 'historico') {
      setSelectedFuncionario('');
      setViewMode('funcionarios');
    } else if (viewMode === 'funcionarios') {
      setLojaSelecionada(null);
      setViewMode('lojas');
    } else if (viewMode === 'lojas') {
      setGrupoSelecionado(null);
      setViewMode('grupos');
    }
  };

  const getBreadcrumb = () => {
    const parts = ['Pontos'];
    if (grupoSelecionado) {
      const g = funcionariosPorGrupo.find(x => x.id === grupoSelecionado);
      if (g) parts.push(g.nome);
    }
    if (lojaSelecionada) {
      const l = funcionariosPorLoja.find(x => x.id === lojaSelecionada);
      if (l) parts.push(l.nome);
    }
    if (funcionarioInfo?.nome) parts.push(funcionarioInfo.nome);
    return parts.join(' > ');
  };

  const changeMonth = (dir: 'prev' | 'next') => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (dir === 'prev') {
      const d = new Date(y, m - 2, 1);
      setSelectedMonth(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      );
    } else {
      const d = new Date(y, m, 1);
      setSelectedMonth(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      );
    }
  };

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

  const exportarLojaPDF = async () => {
    if (!grupoSelecionado || !lojaSelecionada || !selectedMonth) {
      toast.error('Selecione grupo, loja e mês');
      return;
    }
    setExportingGrupo(true);
    try {
      const params = new URLSearchParams({
        grupoId: grupoSelecionado,
        unidadeId: lojaSelecionada,
        month: selectedMonth,
      });
      const response = await fetch(
        `/api/ponto/folhas-grupo/pdf?${params.toString()}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao exportar');
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `folhas-ponto-loja-${selectedMonth}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('PDF gerado');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar PDF');
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

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const names = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return `${names[m - 1]} de ${y}`;
  })();

  return (
    <div className="space-y-6">
      {/* Header estilo app: fundo #009ee2, breadcrumb, mês */}
      <div className="rounded-xl bg-[#009ee2] px-4 py-4 shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {viewMode !== 'grupos' && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9 rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={handleBack}
              >
                <span className="sr-only">Voltar</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">
                {viewMode === 'historico'
                  ? 'Folha de Ponto'
                  : 'Gerenciar Pontos'}
              </h1>
              {viewMode !== 'grupos' && (
                <p className="text-sm text-white/90 truncate max-w-md">
                  {getBreadcrumb()}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={() =>
              viewMode === 'historico' && selectedFuncionario && carregarFolha()
            }
            variant="secondary"
            size="sm"
            className="rounded-full bg-white/20 text-white hover:bg-white/30"
            disabled={loading}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-1', loading && 'animate-spin')}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Seletor de mês (igual app) */}
      {viewMode !== 'historico' && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => changeMonth('prev')}
          >
            <span className="text-lg font-bold">‹</span>
          </Button>
          <span className="font-semibold text-foreground">{monthLabel}</span>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => changeMonth('next')}
          >
            <span className="text-lg font-bold">›</span>
          </Button>
        </div>
      )}

      {/* Conteúdo: cards ou folha */}
      {loadingFolhas ? (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-[#009ee2] mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : viewMode === 'grupos' ? (
        <div className="space-y-3">
          {funcionariosPorGrupo.length === 0 ? (
            <Card className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Nenhum grupo vinculado ao seu perfil.
              </p>
            </Card>
          ) : (
            funcionariosPorGrupo.map(grupo => {
              const problemas = grupo.funcionarios.filter(
                f => calcularPontosFaltantes(f).length > 0
              ).length;
              return (
                <button
                  key={grupo.id}
                  type="button"
                  onClick={() => handleGrupoPress(grupo.id)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[#009ee2]/30 hover:shadow-md flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {grupo.nome}
                      </p>
                      <p className="text-sm text-gray-500">
                        {grupo.funcionarios.length} funcionário
                        {grupo.funcionarios.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {problemas > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {problemas}
                      </span>
                    )}
                    <span className="text-gray-400">›</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : viewMode === 'lojas' ? (
        <div className="space-y-3">
          {funcionariosPorLoja.map(loja => {
            const problemas = loja.funcionarios.filter(
              f => calcularPontosFaltantes(f).length > 0
            ).length;
            return (
              <button
                key={loja.id}
                type="button"
                onClick={() => handleLojaPress(loja.id)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[#009ee2]/30 hover:shadow-md flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{loja.nome}</p>
                    <p className="text-sm text-gray-500">
                      {loja.funcionarios.length} funcionário
                      {loja.funcionarios.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {problemas > 0 && (
                    <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {problemas}
                    </span>
                  )}
                  <span className="text-gray-400">›</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : viewMode === 'funcionarios' ? (
        <div className="space-y-3">
          <Button
            onClick={exportarLojaPDF}
            disabled={exportingGrupo || !grupoSelecionado || !lojaSelecionada}
            className="w-full bg-[#009ee2] hover:bg-[#0080c0]"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportingGrupo ? 'Gerando PDF...' : 'Exportar PDF da loja'}
          </Button>
          {funcionariosDaLoja.map(func => {
            const pontosFaltantes = calcularPontosFaltantes(func);
            const temProblema = pontosFaltantes.length > 0;
            return (
              <button
                key={func.id}
                type="button"
                onClick={() => handleFuncionarioPress(func)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left shadow-sm transition flex items-center justify-between',
                  temProblema
                    ? 'border-red-300 bg-red-50/50'
                    : 'border-gray-200 bg-white hover:border-[#009ee2]/30 hover:shadow-md'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      temProblema
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{func.nome}</p>
                    {func.cpf && (
                      <p className="text-sm text-gray-500">CPF: {func.cpf}</p>
                    )}
                    {temProblema && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pontosFaltantes.map((p, i) => (
                          <span
                            key={i}
                            className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white"
                          >
                            Falta: {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-gray-400">›</span>
              </button>
            );
          })}
          {funcionariosDaLoja.length === 0 && (
            <Card className="py-8 text-center">
              <p className="text-muted-foreground">
                Nenhum funcionário nesta loja.
              </p>
            </Card>
          )}
        </div>
      ) : null}

      {/* Abaixo: Informações do Funcionário + Folha (quando viewMode === historico) */}
      {viewMode === 'historico' && selectedFuncionario && (
        <>
          {loading && !funcionarioInfo && (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-[#009ee2] mb-4" />
              <p className="text-muted-foreground">
                Carregando folha de ponto...
              </p>
            </div>
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
                        toast.error(
                          'Informações do funcionário não encontradas'
                        );
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

                      if (lojaSelecionada) {
                        params.append('unidadeId', lojaSelecionada);
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
                          const cpfClean = funcionarioInfo.cpf.replace(
                            /\D/g,
                            ''
                          );
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

                        if (lojaSelecionada) {
                          params.append('unidadeId', lojaSelecionada);
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
                        const isDiaAdicionadoSupervisor =
                          temPontos && semHorarios;

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
                                <span className="ml-2 text-xs">
                                  (Adicionado)
                                </span>
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
                                              pontoIntervaloInicio?.observacao ||
                                              ''
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
                                        <span className="text-xs">
                                          🚨 FALTANDO
                                        </span>
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                    {canEdit &&
                                      (() => {
                                        // Se tem intervalo fim mas não tem início, mostrar aviso e botão para adicionar
                                        const temIntervaloFim =
                                          row.pontos?.some(
                                            p => p.tipo === 'INTERVALO_FIM'
                                          );
                                        if (
                                          temIntervaloFim &&
                                          !pontoIntervaloInicio
                                        ) {
                                          return (
                                            <div className="mt-1">
                                              <div className="text-xs text-red-600 font-bold mb-1">
                                                🚨 Intervalo início não
                                                registrado!
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
                                                        p.tipo ===
                                                        'INTERVALO_FIM'
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
                                                      format(
                                                        dataInicio,
                                                        'HH:mm'
                                                      )
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
                                              Adicione o horário correto de
                                              início do intervalo
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
                                row.pontos?.find(
                                  p => p.tipo === 'INTERVALO_FIM'
                                ) &&
                                (() => {
                                  const pontoIntervaloFim = row.pontos.find(
                                    p => p.tipo === 'INTERVALO_FIM'
                                  )!;
                                  if (!pontoIntervaloFim.criadoPorId)
                                    return null;
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
                                          handleExcluirPonto(
                                            pontoIntervaloFim.id
                                          )
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
                                  return (
                                    <span className="text-gray-400">—</span>
                                  );
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
                                    setHoraPontoEdit(
                                      format(new Date(), 'HH:mm')
                                    );
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
                          const [ano, mes] = selectedMonth
                            .split('-')
                            .map(Number);
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
                            const cpfClean = funcionarioInfo.cpf.replace(
                              /\D/g,
                              ''
                            );
                            if (cpfClean.length === 11) {
                              params.append('cpf', cpfClean);
                            } else {
                              // Se CPF inválido, usar funcionarioId
                              params.append(
                                'funcionarioId',
                                funcionarioInfo.id
                              );
                            }
                          } else {
                            // Se não tem CPF, usar funcionarioId
                            params.append('funcionarioId', funcionarioInfo.id);
                          }

                          if (lojaSelecionada) {
                            params.append('unidadeId', lojaSelecionada);
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
                      Nenhum registro de ponto encontrado para este período. A
                      folha será gerada automaticamente quando você adicionar
                      pontos.
                    </p>
                    {canEdit && (
                      <Button
                        onClick={() => {
                          // Usar o mês selecionado, não o mês atual
                          const [ano, mes] = selectedMonth
                            .split('-')
                            .map(Number);
                          const hoje = new Date(
                            ano,
                            mes - 1,
                            new Date().getDate()
                          );
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
        </>
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
