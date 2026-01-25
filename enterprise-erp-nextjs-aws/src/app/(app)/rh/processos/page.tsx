'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { hasRouteAccess } from '@/lib/rbac';

interface ParcelaProcesso {
  id: string;
  valor: number;
  diaVencimento: number;
  mesVencimento: number;
  anoVencimento: number | null;
  status: 'PENDENTE' | 'PAGA' | 'VENCIDA';
  notificadoEm: string | null;
  pagoEm: string | null;
  observacoes: string | null;
}

interface ProcessoJuridico {
  id: string;
  numeroProcesso: string;
  reclamante: string | null;
  advogado: string | null;
  escritorio: string | null;
  tipoProcesso: string | null;
  valorCausa: number | null;
  observacoes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  parcelas: ParcelaProcesso[];
  criadoPor: {
    id: string;
    name: string;
    email: string;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  ARQUIVADO: { label: 'Arquivado', color: 'bg-gray-100 text-gray-800' },
  AGUARDANDO_PAGAMENTO: {
    label: 'Aguardando Pagamento',
    color: 'bg-yellow-100 text-yellow-800',
  },
  PAGO: { label: 'Pago', color: 'bg-green-100 text-green-800' },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export default function ProcessosJuridicosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role as
    | 'MASTER'
    | 'ADMIN'
    | 'RH'
    | 'JURIDICO'
    | 'OPERACIONAL'
    | undefined;
  const canView = hasRouteAccess(role, ['MASTER', 'ADMIN', 'RH', 'JURIDICO']);
  const canManage = hasRouteAccess(role, ['MASTER', 'ADMIN', 'RH', 'JURIDICO']);

  const [processos, setProcessos] = useState<ProcessoJuridico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcesso, setEditingProcesso] =
    useState<ProcessoJuridico | null>(null);
  const [deletingProcesso, setDeletingProcesso] =
    useState<ProcessoJuridico | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    numeroProcesso: '',
    reclamante: '',
    advogado: '',
    escritorio: '',
    tipoProcesso: '',
    valorCausa: '',
    observacoes: '',
    status: 'EM_ANDAMENTO' as const,
    // Configuração para gerar parcelas automaticamente
    valorTotalParcelas: '',
    dataInicialParcela: '', // formato: YYYY-MM-DD
    dataFinalParcela: '', // formato: YYYY-MM-DD
  });

  // Estado para gerenciar parcelas editáveis
  const [parcelasEditaveis, setParcelasEditaveis] = useState<
    Array<{
      valor: number;
      diaVencimento: number;
      mesVencimento: number;
      anoVencimento: number;
      observacoes: string | null;
    }>
  >([]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated' && !canView) {
      router.replace('/dashboard');
    }
  }, [status, canView, router]);

  useEffect(() => {
    if (!canView) {
      setProcessos([]);
      setLoading(false);
      return;
    }
    fetchProcessos();
  }, [searchTerm, selectedStatus, canView]);

  const fetchProcessos = async () => {
    if (!canView) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(
        `/api/processos-juridicos?${params.toString()}`
      );
      const result = await response.json();

      if (response.ok) {
        setProcessos(result.processos || []);
      } else {
        toast.error(result.error || 'Erro ao carregar processos');
      }
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular parcelas baseado em data inicial e final
  const calcularParcelas = (
    valorTotal: number,
    dataInicial: string,
    dataFinal: string
  ) => {
    if (!valorTotal || !dataInicial || !dataFinal) return [];

    const inicio = new Date(dataInicial + 'T12:00:00');
    const fim = new Date(dataFinal + 'T12:00:00');

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || inicio > fim) {
      return [];
    }

    const parcelas = [];

    // Pegar o dia do mês da data inicial
    const diaVencimento = inicio.getDate();

    // Calcular quantas parcelas existem entre as datas (incluindo inicial e final)
    let mesAtual = new Date(inicio);
    let quantidadeParcelas = 0;

    while (mesAtual <= fim) {
      quantidadeParcelas++;
      // Avançar para o próximo mês mantendo o mesmo dia
      const ano = mesAtual.getFullYear();
      const mes = mesAtual.getMonth();
      // Usar o último dia do mês se o dia for maior que os dias disponíveis
      const ultimoDiaDoMes = new Date(ano, mes + 2, 0).getDate();
      const diaParaUsar = Math.min(diaVencimento, ultimoDiaDoMes);
      mesAtual = new Date(ano, mes + 1, diaParaUsar);
    }

    if (quantidadeParcelas === 0) return [];

    // Dividir valor igualmente (arredondar para 2 casas decimais)
    const valorParcela =
      Math.round((valorTotal / quantidadeParcelas) * 100) / 100;
    // Ajustar a última parcela para compensar arredondamentos
    const somaParcelas = valorParcela * (quantidadeParcelas - 1);
    const ultimoValor = valorTotal - somaParcelas;

    // Gerar parcelas
    mesAtual = new Date(inicio);
    let index = 0;
    while (mesAtual <= fim && index < quantidadeParcelas) {
      const ano = mesAtual.getFullYear();
      const mes = mesAtual.getMonth() + 1;

      // Usar o último dia do mês se o dia for maior que os dias disponíveis
      const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
      const diaParaUsar = Math.min(diaVencimento, ultimoDiaDoMes);

      parcelas.push({
        valor: index === quantidadeParcelas - 1 ? ultimoValor : valorParcela,
        diaVencimento: diaParaUsar,
        mesVencimento: mes,
        anoVencimento: ano,
        observacoes: null,
      });

      // Avançar para o próximo mês mantendo o mesmo dia
      const proximoMes = mes === 12 ? 1 : mes + 1;
      const proximoAno = mes === 12 ? ano + 1 : ano;
      const ultimoDiaProximoMes = new Date(proximoAno, proximoMes, 0).getDate();
      const diaProximoMes = Math.min(diaVencimento, ultimoDiaProximoMes);
      mesAtual = new Date(proximoAno, proximoMes - 1, diaProximoMes);
      index++;
    }

    return parcelas;
  };

  // Função para atualizar parcelas quando os campos de geração automática mudarem
  // Só recalcula se não houver parcelas editáveis ou se os campos mudarem significativamente
  useEffect(() => {
    // Não recalcular se já houver parcelas editáveis (usuário pode ter editado)
    // Só recalcular se os campos de geração automática mudarem e não houver parcelas editáveis
    if (
      formData.valorTotalParcelas &&
      formData.dataInicialParcela &&
      formData.dataFinalParcela &&
      parcelasEditaveis.length === 0
    ) {
      const novasParcelas = calcularParcelas(
        parseFloat(formData.valorTotalParcelas) || 0,
        formData.dataInicialParcela,
        formData.dataFinalParcela
      );
      setParcelasEditaveis(novasParcelas);
    } else if (
      !formData.valorTotalParcelas ||
      !formData.dataInicialParcela ||
      !formData.dataFinalParcela
    ) {
      // Limpar parcelas se os campos obrigatórios não estiverem preenchidos
      if (parcelasEditaveis.length === 0) {
        setParcelasEditaveis([]);
      }
    }
  }, [
    formData.valorTotalParcelas,
    formData.dataInicialParcela,
    formData.dataFinalParcela,
    // Não incluir parcelasEditaveis nas dependências para evitar loop
  ]);

  // Função para atualizar valor de uma parcela específica
  const atualizarValorParcela = (index: number, novoValor: number) => {
    if (novoValor < 0) return;
    const novasParcelas = [...parcelasEditaveis];
    novasParcelas[index] = {
      ...novasParcelas[index],
      valor: Math.round(novoValor * 100) / 100, // Arredondar para 2 casas decimais
    };
    setParcelasEditaveis(novasParcelas);
  };

  const handleOpenDialog = (processo?: ProcessoJuridico) => {
    if (!canManage) return;
    if (processo) {
      setEditingProcesso(processo);
      // Calcular data inicial e final baseado nas parcelas existentes
      const parcelas = processo.parcelas || [];
      let dataInicial = '';
      let dataFinal = '';
      let valorTotal = 0;

      if (parcelas.length > 0) {
        const primeiraParcela = parcelas[0];
        const ultimaParcela = parcelas[parcelas.length - 1];
        const anoInicial =
          primeiraParcela.anoVencimento || new Date().getFullYear();
        const anoFinal =
          ultimaParcela.anoVencimento || new Date().getFullYear();

        dataInicial = `${anoInicial}-${String(primeiraParcela.mesVencimento).padStart(2, '0')}-${String(primeiraParcela.diaVencimento).padStart(2, '0')}`;
        dataFinal = `${anoFinal}-${String(ultimaParcela.mesVencimento).padStart(2, '0')}-${String(ultimaParcela.diaVencimento).padStart(2, '0')}`;

        valorTotal = parcelas.reduce((sum, p) => sum + p.valor, 0);
      }

      // Carregar parcelas existentes no estado editável
      setParcelasEditaveis(
        parcelas.map(p => ({
          valor: p.valor,
          diaVencimento: p.diaVencimento,
          mesVencimento: p.mesVencimento,
          anoVencimento: p.anoVencimento || new Date().getFullYear(),
          observacoes: p.observacoes,
        }))
      );

      setFormData({
        numeroProcesso: processo.numeroProcesso,
        reclamante: processo.reclamante || '',
        advogado: processo.advogado || '',
        escritorio: processo.escritorio || '',
        tipoProcesso: processo.tipoProcesso || '',
        valorCausa: processo.valorCausa?.toString() || '',
        observacoes: processo.observacoes || '',
        status: processo.status as any,
        valorTotalParcelas: valorTotal.toString(),
        dataInicialParcela: dataInicial,
        dataFinalParcela: dataFinal,
      });
    } else {
      setEditingProcesso(null);
      setParcelasEditaveis([]);
      setFormData({
        numeroProcesso: '',
        reclamante: '',
        advogado: '',
        escritorio: '',
        tipoProcesso: '',
        valorCausa: '',
        observacoes: '',
        status: 'EM_ANDAMENTO',
        valorTotalParcelas: '',
        dataInicialParcela: '',
        dataFinalParcela: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!canManage) return;
    setIsDialogOpen(false);
    setEditingProcesso(null);
    setParcelasEditaveis([]);
    setFormData({
      numeroProcesso: '',
      reclamante: '',
      advogado: '',
      escritorio: '',
      tipoProcesso: '',
      valorCausa: '',
      observacoes: '',
      status: 'EM_ANDAMENTO',
      valorTotalParcelas: '',
      dataInicialParcela: '',
      dataFinalParcela: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!canManage) return;
    e.preventDefault();
    setFormLoading(true);

    try {
      const url = editingProcesso
        ? `/api/processos-juridicos/${editingProcesso.id}`
        : '/api/processos-juridicos';

      const method = editingProcesso ? 'PUT' : 'POST';

      // Usar parcelas editáveis se existirem, senão calcular automaticamente
      let parcelas: Array<{
        valor: number;
        diaVencimento: number;
        mesVencimento: number;
        anoVencimento: number;
        observacoes: string | null;
      }> = [];

      if (parcelasEditaveis.length > 0) {
        // Usar parcelas editadas pelo usuário
        parcelas = parcelasEditaveis;
      } else if (
        formData.valorTotalParcelas &&
        formData.dataInicialParcela &&
        formData.dataFinalParcela
      ) {
        // Fallback para cálculo automático se não houver parcelas editáveis
        parcelas = calcularParcelas(
          parseFloat(formData.valorTotalParcelas),
          formData.dataInicialParcela,
          formData.dataFinalParcela
        );
      }

      const payload = {
        numeroProcesso: formData.numeroProcesso,
        reclamante: formData.reclamante || null,
        advogado: formData.advogado || null,
        escritorio: formData.escritorio || null,
        tipoProcesso: formData.tipoProcesso || null,
        valorCausa: formData.valorCausa
          ? parseFloat(formData.valorCausa)
          : null,
        observacoes: formData.observacoes || null,
        status: formData.status,
        parcelas: parcelas.map(p => ({
          valor: p.valor,
          diaVencimento: p.diaVencimento,
          mesVencimento: p.mesVencimento,
          anoVencimento: p.anoVencimento,
          observacoes: p.observacoes,
        })),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          editingProcesso
            ? 'Processo atualizado com sucesso!'
            : 'Processo criado com sucesso!'
        );
        handleCloseDialog();
        fetchProcessos();
      } else {
        toast.error(result.error || 'Erro ao salvar processo');
      }
    } catch (error) {
      console.error('Erro ao salvar processo:', error);
      toast.error('Erro ao salvar processo');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage) return;
    if (!deletingProcesso) return;

    try {
      const response = await fetch(
        `/api/processos-juridicos/${deletingProcesso.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        toast.success('Processo excluído com sucesso!');
        setDeletingProcesso(null);
        fetchProcessos();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Erro ao excluir processo');
      }
    } catch (error) {
      console.error('Erro ao excluir processo:', error);
      toast.error('Erro ao excluir processo');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getParcelaVencimentoStatus = (parcela: ParcelaProcesso) => {
    const hoje = new Date();
    const ano = parcela.anoVencimento || hoje.getFullYear();
    const dataVencimento = new Date(
      ano,
      parcela.mesVencimento - 1,
      parcela.diaVencimento
    );
    const dias = differenceInDays(dataVencimento, hoje);

    if (parcela.status === 'PAGA') {
      return { text: 'Paga', urgent: false, status: 'paga' };
    }

    if (isPast(dataVencimento)) {
      return {
        text: `${Math.abs(dias)} dias atrás`,
        urgent: true,
        status: 'vencida',
      };
    } else if (dias <= 2) {
      return { text: `Vence em ${dias} dias`, urgent: true, status: 'proximo' };
    } else if (dias <= 7) {
      return { text: `Vence em ${dias} dias`, urgent: true, status: 'proximo' };
    }
    return { text: `Vence em ${dias} dias`, urgent: false, status: 'ok' };
  };

  const processosComAlerta = processos.filter(p => {
    return p.parcelas?.some(parcela => {
      if (parcela.status === 'PAGA') return false;
      const status = getParcelaVencimentoStatus(parcela);
      return status.urgent && p.status !== 'PAGO' && p.status !== 'ARQUIVADO';
    });
  });

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status !== 'authenticated' || !canView) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Processos Jurídicos
          </h1>
          <p className="text-gray-600">
            Gerencie processos que precisam de acompanhamento e pagamento
          </p>
        </div>
        <Dialog
          open={isDialogOpen && canManage}
          onOpenChange={open => {
            if (!canManage) return;
            setIsDialogOpen(open);
          }}
        >
          {canManage && (
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4" />
                Novo Processo
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="!max-w-[80vw] !w-[80vw] max-h-[90vh] overflow-y-auto sm:!max-w-[95vw]">
            <DialogHeader>
              <DialogTitle>
                {editingProcesso ? 'Editar Processo' : 'Novo Processo Jurídico'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do processo jurídico abaixo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroProcesso">
                    Número do Processo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="numeroProcesso"
                    value={formData.numeroProcesso}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        numeroProcesso: e.target.value,
                      })
                    }
                    placeholder="1234567-89.2024.8.26.0100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipoProcesso">Tipo de Processo</Label>
                  <Input
                    id="tipoProcesso"
                    value={formData.tipoProcesso}
                    onChange={e =>
                      setFormData({ ...formData, tipoProcesso: e.target.value })
                    }
                    placeholder="Ex: Trabalhista, Cível, Tributário"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reclamante">Reclamante</Label>
                  <Input
                    id="reclamante"
                    value={formData.reclamante}
                    onChange={e =>
                      setFormData({ ...formData, reclamante: e.target.value })
                    }
                    placeholder="Nome do reclamante"
                  />
                </div>
                <div>
                  <Label htmlFor="advogado">Advogado</Label>
                  <Input
                    id="advogado"
                    value={formData.advogado}
                    onChange={e =>
                      setFormData({ ...formData, advogado: e.target.value })
                    }
                    placeholder="Nome do advogado"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="escritorio">Escritório de Advocacia</Label>
                <Input
                  id="escritorio"
                  value={formData.escritorio}
                  onChange={e =>
                    setFormData({ ...formData, escritorio: e.target.value })
                  }
                  placeholder="Nome do escritório"
                />
              </div>

              <div>
                <Label htmlFor="valorCausa">Valor da Causa</Label>
                <Input
                  id="valorCausa"
                  type="number"
                  step="0.01"
                  value={formData.valorCausa}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      valorCausa: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              {/* Seção de Parcelas - Configuração Automática */}
              <div className="border-t pt-4">
                <div className="mb-4">
                  <Label className="text-base font-semibold">
                    Configuração de Parcelas
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    O sistema gerará automaticamente as parcelas mensais entre
                    as datas informadas, dividindo o valor total igualmente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="valorTotalParcelas">
                      Valor Total a Parcelar
                    </Label>
                    <Input
                      id="valorTotalParcelas"
                      type="number"
                      step="0.01"
                      value={formData.valorTotalParcelas}
                      onChange={e => {
                        setFormData({
                          ...formData,
                          valorTotalParcelas: e.target.value,
                        });
                        // Limpar parcelas editáveis para recalcular quando valor mudar
                        if (parcelasEditaveis.length > 0) {
                          setParcelasEditaveis([]);
                        }
                      }}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Valor total que será dividido entre as parcelas (você pode
                      editar valores individuais depois)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dataInicialParcela">
                      Data Inicial <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dataInicialParcela"
                      type="date"
                      value={formData.dataInicialParcela}
                      onChange={e => {
                        setFormData({
                          ...formData,
                          dataInicialParcela: e.target.value,
                        });
                        // Limpar parcelas editáveis para recalcular quando campos mudarem
                        if (parcelasEditaveis.length > 0) {
                          setParcelasEditaveis([]);
                        }
                      }}
                      required={
                        formData.dataFinalParcela || formData.valorTotalParcelas
                          ? true
                          : false
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Data da primeira parcela (dia/mês/ano)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dataFinalParcela">
                      Data Final <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dataFinalParcela"
                      type="date"
                      value={formData.dataFinalParcela}
                      onChange={e => {
                        setFormData({
                          ...formData,
                          dataFinalParcela: e.target.value,
                        });
                        // Limpar parcelas editáveis para recalcular quando campos mudarem
                        if (parcelasEditaveis.length > 0) {
                          setParcelasEditaveis([]);
                        }
                      }}
                      required={
                        formData.dataInicialParcela ||
                        formData.valorTotalParcelas
                          ? true
                          : false
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Data da última parcela (dia/mês/ano)
                    </p>
                  </div>
                </div>

                {/* Botão para regenerar parcelas */}
                {parcelasEditaveis.length > 0 && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          formData.valorTotalParcelas &&
                          formData.dataInicialParcela &&
                          formData.dataFinalParcela
                        ) {
                          const novasParcelas = calcularParcelas(
                            parseFloat(formData.valorTotalParcelas) || 0,
                            formData.dataInicialParcela,
                            formData.dataFinalParcela
                          );
                          setParcelasEditaveis(novasParcelas);
                        }
                      }}
                      className="text-xs"
                    >
                      Regenerar Parcelas (distribuir igualmente)
                    </Button>
                  </div>
                )}

                {/* Preview das parcelas que serão geradas - com edição */}
                {parcelasEditaveis.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold text-blue-900">
                        Parcelas (edite os valores conforme necessário):
                      </Label>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-blue-700 font-medium">
                          Total das parcelas:{' '}
                          {formatCurrency(
                            parcelasEditaveis.reduce(
                              (sum, p) => sum + p.valor,
                              0
                            )
                          )}
                        </span>
                        {formData.valorTotalParcelas && (
                          <span
                            className={`text-xs font-medium ${
                              Math.abs(
                                parseFloat(formData.valorTotalParcelas) -
                                  parcelasEditaveis.reduce(
                                    (sum, p) => sum + p.valor,
                                    0
                                  )
                              ) > 0.01
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}
                          >
                            Valor original:{' '}
                            {formatCurrency(
                              parseFloat(formData.valorTotalParcelas) || 0
                            )}
                            {Math.abs(
                              parseFloat(formData.valorTotalParcelas) -
                                parcelasEditaveis.reduce(
                                  (sum, p) => sum + p.valor,
                                  0
                                )
                            ) > 0.01 && (
                              <span className="ml-1">
                                (diferença:{' '}
                                {formatCurrency(
                                  parcelasEditaveis.reduce(
                                    (sum, p) => sum + p.valor,
                                    0
                                  ) -
                                    (parseFloat(formData.valorTotalParcelas) ||
                                      0)
                                )}
                                )
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {parcelasEditaveis.map((parcela, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 text-sm bg-white p-3 rounded border hover:bg-blue-50 transition-colors"
                        >
                          <span className="font-medium w-24 flex-shrink-0">
                            Parcela {index + 1}:
                          </span>
                          <span className="text-gray-600 text-sm w-36 flex-shrink-0">
                            {String(parcela.diaVencimento).padStart(2, '0')}/
                            {String(parcela.mesVencimento).padStart(2, '0')}/
                            {parcela.anoVencimento}
                          </span>
                          <div className="flex-1 flex items-center justify-end gap-2">
                            <span className="text-gray-700 font-medium text-base">
                              R$
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={parcela.valor.toFixed(2)}
                              onChange={e => {
                                const novoValor =
                                  parseFloat(e.target.value) || 0;
                                atualizarValorParcela(index, novoValor);
                              }}
                              className="w-56 h-10 text-base font-semibold text-right border-2 focus:border-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      {parcelasEditaveis.length} parcela(s) serão criadas. Você
                      pode editar os valores individuais acima para ajustar
                      valores mensais diferentes.
                    </p>
                  </div>
                )}

                {(!formData.valorTotalParcelas ||
                  !formData.dataInicialParcela ||
                  !formData.dataFinalParcela) && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 italic">
                      Preencha os campos acima para gerar as parcelas
                      automaticamente. O sistema criará parcelas mensais entre
                      as datas informadas, dividindo o valor total igualmente.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={e =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Observações gerais sobre o processo..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={formLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingProcesso ? (
                    'Atualizar'
                  ) : (
                    'Criar Processo'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas de vencimento */}
      {processosComAlerta.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">
              Atenção: {processosComAlerta.length} processo(s) com parcela(s)
              vencendo em breve
            </h3>
          </div>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {processosComAlerta.slice(0, 5).map(p => {
              const parcelaUrgente = p.parcelas?.find(parcela => {
                if (parcela.status === 'PAGA') return false;
                const status = getParcelaVencimentoStatus(parcela);
                return status.urgent;
              });
              if (!parcelaUrgente) return null;
              const status = getParcelaVencimentoStatus(parcelaUrgente);
              return (
                <li key={p.id}>
                  {p.numeroProcesso} - Parcela de{' '}
                  {formatCurrency(parcelaUrgente.valor)}
                  {' vence em '}
                  {parcelaUrgente.diaVencimento}/{parcelaUrgente.mesVencimento}
                  {parcelaUrgente.anoVencimento &&
                    `/${parcelaUrgente.anoVencimento}`}
                  {' - '}
                  {status.text}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Buscar
            </label>
            <Input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Número do processo, reclamante, advogado..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Status
            </label>
            <Select
              value={selectedStatus || undefined}
              onValueChange={value =>
                setSelectedStatus(value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
              }}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Processos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : processos.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum processo encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedStatus
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando um novo processo jurídico'}
            </p>
            {canManage && !searchTerm && !selectedStatus && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Processo
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número do Processo</TableHead>
                <TableHead>Reclamante</TableHead>
                <TableHead>Advogado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor da Causa</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processos.map(processo => {
                const parcelasPendentes =
                  processo.parcelas?.filter(p => p.status !== 'PAGA') || [];
                const totalPendente = parcelasPendentes.reduce(
                  (sum, p) => sum + p.valor,
                  0
                );
                const parcelaProxima = processo.parcelas?.find(p => {
                  if (p.status === 'PAGA') return false;
                  const status = getParcelaVencimentoStatus(p);
                  return status.urgent;
                });

                return (
                  <TableRow key={processo.id}>
                    <TableCell className="font-medium">
                      {processo.numeroProcesso}
                    </TableCell>
                    <TableCell>{processo.reclamante || '—'}</TableCell>
                    <TableCell>{processo.advogado || '—'}</TableCell>
                    <TableCell>{processo.tipoProcesso || '—'}</TableCell>
                    <TableCell>{formatCurrency(processo.valorCausa)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {formatCurrency(totalPendente)} pendente
                        </div>
                        <div className="text-xs text-gray-500">
                          {parcelasPendentes.length} parcela(s) pendente(s)
                        </div>
                        {parcelaProxima && (
                          <div className="text-xs">
                            <span className="text-red-600 font-medium">
                              Próxima: {parcelaProxima.diaVencimento}/
                              {parcelaProxima.mesVencimento}
                              {parcelaProxima.anoVencimento &&
                                `/${parcelaProxima.anoVencimento}`}
                              {' - '}
                              {getParcelaVencimentoStatus(parcelaProxima).text}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_LABELS[processo.status]?.color ||
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {STATUS_LABELS[processo.status]?.label ||
                          processo.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(processo)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog
                            open={deletingProcesso?.id === processo.id}
                            onOpenChange={open => {
                              if (!open) setDeletingProcesso(null);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingProcesso(processo)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Confirmar exclusão
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o processo{' '}
                                  <strong>{processo.numeroProcesso}</strong>?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  onClick={() => setDeletingProcesso(null)}
                                >
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
