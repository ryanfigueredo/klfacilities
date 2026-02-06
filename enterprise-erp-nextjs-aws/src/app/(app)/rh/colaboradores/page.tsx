'use client';

import { useEffect, useMemo, useState, Suspense, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { normName } from '@/lib/utils/currency';
import { hasRouteAccess } from '@/lib/rbac';
import {
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Row = {
  id: string;
  nome: string;
  cpf: string | null;
  grupo: string;
  unidadeId: string | null;
  unidadeNome: string | null;
  fotoUrl: string | null;
  temFotoFacial: boolean;
  temCracha: boolean;
  fotoCracha: string | null;
  cargo: string | null;
  diaFolga: number | null;
};

function PageInner() {
  const { data: session } = useSession();
  // MASTER tem acesso total, RH pode gerenciar colaboradores
  const canView = hasRouteAccess(session?.user?.role as any, [
    'MASTER',
    'RH',
    'OPERACIONAL',
  ]);
  const canEdit = hasRouteAccess(session?.user?.role as any, [
    'MASTER',
    'RH',
  ]); // MASTER e RH podem criar/editar
  const sp = useSearchParams();
  const router = useRouter();

  const q = sp.get('q') ?? '';
  const grupoFiltro = sp.get('grupoId') ?? '__all';
  const unidadeFiltro = sp.get('unidadeId') ?? '__all';
  const sortBy = sp.get('sortBy') ?? 'nome';
  const sortOrder = sp.get('sortOrder') ?? 'asc';
  const [rows, setRows] = useState<Row[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [solicitacoesExclusao, setSolicitacoesExclusao] = useState<any[]>([]);
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false);
  const [colaboradorParaExcluir, setColaboradorParaExcluir] =
    useState<Row | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState('');
  const [loadingExclusao, setLoadingExclusao] = useState(false);
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);
  const [colaboradorFoto, setColaboradorFoto] = useState<Row | null>(null);
  const isMaster = session?.user?.role === 'MASTER';
  const isRH = session?.user?.role === 'RH';
  const canApproveExclusao = isMaster;
  const canSolicitarExclusao = isMaster || isRH;

  // Estados para o formulário de novo colaborador
  const [novoColaboradorGrupoId, setNovoColaboradorGrupoId] = useState('');
  const [novoColaboradorUnidadeId, setNovoColaboradorUnidadeId] = useState<
    string | undefined
  >(undefined);
  const [novoColaboradorCargo, setNovoColaboradorCargo] = useState('');
  const [novoColaboradorDiaFolga, setNovoColaboradorDiaFolga] =
    useState<string>('');
  const [novoColaboradorFotoCracha, setNovoColaboradorFotoCracha] =
    useState<File | null>(null);
  const [novoColaboradorDialogOpen, setNovoColaboradorDialogOpen] =
    useState(false);
  const [unidadesFiltradas, setUnidadesFiltradas] = useState<
    { id: string; nome: string }[]
  >([]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (grupoFiltro && grupoFiltro !== '__all') {
      p.set('grupoId', grupoFiltro);
    }
    if (unidadeFiltro && unidadeFiltro !== '__all') {
      p.set('unidadeId', unidadeFiltro);
    }
    if (sortBy && sortBy !== 'nome') p.set('sortBy', sortBy);
    if (sortOrder && sortOrder !== 'asc') p.set('sortOrder', sortOrder);
    return p.toString();
  }, [q, grupoFiltro, unidadeFiltro, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    const p = new URLSearchParams(sp.toString());
    if (sortBy === column) {
      // Alternar ordem
      p.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Nova coluna, ordem padrão asc
      p.set('sortBy', column);
      p.set('sortOrder', 'asc');
    }
    router.push('/rh/colaboradores?' + p.toString());
  };

  const handleGrupoFilter = (value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value === '__all') {
      p.delete('grupoId');
    } else {
      p.set('grupoId', value);
    }
    router.push('/rh/colaboradores?' + p.toString());
  };

  const handleUnidadeFilter = (value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value === '__all') {
      p.delete('unidadeId');
    } else {
      p.set('unidadeId', value);
    }
    router.push('/rh/colaboradores?' + p.toString());
  };

  useEffect(() => {
    if (!canView) return;
    (async () => {
      const [funcsRes, unitsRes, gruposRes, solicitacoesRes] =
        await Promise.all([
          fetch('/api/funcionarios?' + qs),
          fetch('/api/unidades'),
          fetch('/api/grupos'),
          canApproveExclusao
            ? fetch('/api/funcionarios/solicitacoes-exclusao?status=PENDENTE')
            : Promise.resolve(null),
        ]);
      const funcs = await funcsRes.json().catch(() => []);
      const units = await unitsRes.json().catch(() => []);
      const grps = await gruposRes.json().catch(() => []);
      const funcionariosData = Array.isArray(funcs?.rows) ? funcs.rows : funcs;
      // Garantir que diaFolga existe em todos os funcionários
      setRows(
        funcionariosData.map((f: any) => ({
          ...f,
          diaFolga: f.diaFolga !== undefined ? f.diaFolga : null,
        }))
      );
      setUnidades(Array.isArray(units?.rows) ? units.rows : units);
      // API de grupos retorna { data: [...] }
      setGrupos(
        Array.isArray(grps?.data)
          ? grps.data
          : Array.isArray(grps?.rows)
            ? grps.rows
            : Array.isArray(grps)
              ? grps
              : []
      );
      // Carregar solicitações de exclusão (apenas MASTER)
      if (canApproveExclusao && solicitacoesRes) {
        const solicitacoes = await solicitacoesRes.json().catch(() => ({}));
        setSolicitacoesExclusao(solicitacoes?.solicitacoes || []);
      }
    })();
  }, [qs, canView, canApproveExclusao]);

  async function salvarUnidade(id: string, unidadeId: string | null) {
    if (!canEdit) return;
    await fetch('/api/funcionarios/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unidadeId }),
    });
    router.refresh();
  }

  async function salvarDiaFolga(id: string, diaFolga: number | null) {
    if (!canEdit) return;
    try {
      const res = await fetch('/api/funcionarios/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaFolga }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro ao salvar dia de folga');
        return;
      }
      toast.success('Dia de folga atualizado');
      router.refresh();
    } catch (error) {
      console.error('Erro ao salvar dia de folga:', error);
      toast.error('Erro ao salvar dia de folga');
    }
  }

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

  // Carregar unidades quando o grupo for selecionado no formulário
  useEffect(() => {
    if (!novoColaboradorGrupoId) {
      setUnidadesFiltradas([]);
      setNovoColaboradorUnidadeId(undefined);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/mapeamento?grupoId=${encodeURIComponent(novoColaboradorGrupoId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setUnidadesFiltradas(
            Array.isArray(data.unidades) ? data.unidades : []
          );
        } else {
          setUnidadesFiltradas([]);
        }
        // Limpar unidade selecionada quando mudar o grupo
        setNovoColaboradorUnidadeId(undefined);
      } catch (error) {
        console.error('Erro ao carregar unidades do grupo:', error);
        setUnidadesFiltradas([]);
      }
    })();
  }, [novoColaboradorGrupoId]);

  async function solicitarExclusao() {
    if (!colaboradorParaExcluir) return;

    setLoadingExclusao(true);
    try {
      const response = await fetch(
        `/api/funcionarios/${colaboradorParaExcluir.id}/solicitar-exclusao`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: motivoExclusao || null }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(
          result.message ||
            (canApproveExclusao
              ? 'Colaborador excluído com sucesso'
              : 'Solicitação de exclusão enviada com sucesso')
        );
        if (result.warning) {
          toast.warning(result.warning);
        }
        setExcluirDialogOpen(false);
        setColaboradorParaExcluir(null);
        setMotivoExclusao('');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao solicitar exclusão');
      }
    } catch (error) {
      toast.error('Erro ao solicitar exclusão');
      console.error(error);
    } finally {
      setLoadingExclusao(false);
    }
  }

  async function processarAprovacao(solicitacaoId: string, aprovado: boolean) {
    if (!canApproveExclusao) return;
    try {
      const response = await fetch(
        `/api/funcionarios/solicitacoes-exclusao/${solicitacaoId}/aprovar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aprovado, observacoes: null }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Solicitação processada com sucesso');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao processar solicitação');
      }
    } catch (error) {
      toast.error('Erro ao processar solicitação');
      console.error(error);
    }
  }

  if (!canView) return <div className="p-6">Acesso negado</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Colaboradores</h2>
          <p className="text-muted-foreground">
            Vincule colaboradores às unidades
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {/* Novo Colaborador */}
            <Dialog
              open={novoColaboradorDialogOpen}
              onOpenChange={open => {
                setNovoColaboradorDialogOpen(open);
                if (!open) {
                  // Resetar estados quando fechar o dialog
                  setNovoColaboradorGrupoId('');
                  setNovoColaboradorUnidadeId(undefined);
                  setNovoColaboradorCargo('');
                  setNovoColaboradorDiaFolga('');
                  setNovoColaboradorFotoCracha(null);
                  setUnidadesFiltradas([]);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>Novo Colaborador</Button>
              </DialogTrigger>
              <DialogContent a11yTitle="Novo colaborador">
                <DialogHeader>
                  <DialogTitle>Novo colaborador</DialogTitle>
                  <DialogDescription>
                    Cadastre nome completo, CPF (obrigatório), grupo, unidade,
                    cargo e foto para crachá.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    // Normalizar CPF removendo formatação
                    const cpfRaw = String(fd.get('cpf') || '');
                    const cpfNormalizado = cpfRaw.replace(/\D/g, '').trim();

                    // Validar e normalizar diaFolga
                    let diaFolgaValue: number | null = null;
                    if (
                      novoColaboradorDiaFolga &&
                      novoColaboradorDiaFolga !== '' &&
                      novoColaboradorDiaFolga !== '__none'
                    ) {
                      const parsed = parseInt(novoColaboradorDiaFolga);
                      if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
                        diaFolgaValue = parsed;
                      }
                    }

                    const payload = {
                      nome: String(fd.get('nome') || ''),
                      cpf: cpfNormalizado,
                      grupoId: novoColaboradorGrupoId,
                      unidadeId:
                        novoColaboradorUnidadeId === '__none' ||
                        !novoColaboradorUnidadeId
                          ? null
                          : novoColaboradorUnidadeId,
                      cargo: novoColaboradorCargo || null,
                      diaFolga: diaFolgaValue,
                      temCracha: !!novoColaboradorFotoCracha,
                    };
                    if (!payload.nome || !payload.grupoId) {
                      toast.error('Informe Nome e Grupo');
                      return;
                    }
                    if (!cpfNormalizado || cpfNormalizado.length !== 11) {
                      toast.error('CPF é obrigatório e deve ter 11 dígitos');
                      return;
                    }
                    try {
                      // Criar colaborador
                      const r = await fetch('/api/funcionarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });

                      let j: any = {};
                      try {
                        j = await r.json();
                      } catch (jsonError) {
                        // Se não conseguir fazer parse do JSON, usar mensagem padrão
                        console.error(
                          'Erro ao fazer parse da resposta:',
                          jsonError
                        );
                      }

                      if (!r.ok) {
                        toast.error(
                          j?.error || `Falha ao criar colaborador (${r.status})`
                        );
                        return;
                      }

                      if (!j?.id) {
                        toast.error(
                          'Colaborador criado mas não foi retornado o ID'
                        );
                        return;
                      }

                      // Se houver foto de crachá, fazer upload
                      if (novoColaboradorFotoCracha && j.id) {
                        try {
                          const fotoFormData = new FormData();
                          fotoFormData.append(
                            'foto',
                            novoColaboradorFotoCracha
                          );
                          const fotoRes = await fetch(
                            `/api/funcionarios/${j.id}/foto-cracha`,
                            {
                              method: 'POST',
                              body: fotoFormData,
                            }
                          );
                          if (!fotoRes.ok) {
                            toast.warning(
                              'Colaborador criado, mas houve erro ao fazer upload da foto de crachá'
                            );
                          }
                        } catch (fotoError) {
                          console.error(
                            'Erro ao fazer upload da foto:',
                            fotoError
                          );
                          toast.warning(
                            'Colaborador criado, mas houve erro ao fazer upload da foto de crachá'
                          );
                        }
                      }

                      toast.success('Colaborador criado com sucesso');
                      form.reset();
                      setNovoColaboradorGrupoId('');
                      setNovoColaboradorUnidadeId(undefined);
                      setNovoColaboradorCargo('');
                      setNovoColaboradorDiaFolga('');
                      setNovoColaboradorFotoCracha(null);
                      setUnidadesFiltradas([]);
                      setNovoColaboradorDialogOpen(false);
                      router.refresh();
                    } catch (error: any) {
                      console.error('Erro ao criar colaborador:', error);
                      toast.error(
                        error?.message ||
                          'Erro ao criar colaborador. Tente novamente.'
                      );
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome-novo">Nome completo</Label>
                      <Input
                        id="nome-novo"
                        name="nome"
                        placeholder="Nome completo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf-novo">CPF (obrigatório)</Label>
                      <Input
                        id="cpf-novo"
                        name="cpf"
                        placeholder="CPF (obrigatório)"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grupo-novo">Grupo</Label>
                      <Select
                        value={novoColaboradorGrupoId}
                        onValueChange={setNovoColaboradorGrupoId}
                        required
                      >
                        <SelectTrigger id="grupo-novo">
                          <SelectValue placeholder="Selecione o grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          {grupos.map(g => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unidade-novo">Unidade</Label>
                      <Select
                        value={
                          novoColaboradorUnidadeId === undefined
                            ? undefined
                            : novoColaboradorUnidadeId || '__none'
                        }
                        onValueChange={value =>
                          setNovoColaboradorUnidadeId(
                            value === '__none' ? undefined : value
                          )
                        }
                        disabled={!novoColaboradorGrupoId}
                      >
                        <SelectTrigger id="unidade-novo">
                          <SelectValue
                            placeholder={
                              !novoColaboradorGrupoId
                                ? 'Selecione o grupo primeiro'
                                : unidadesFiltradas.length === 0
                                  ? 'Nenhuma unidade disponível'
                                  : 'Selecione a unidade'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Sem unidade</SelectItem>
                          {unidadesFiltradas.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargo-novo">Cargo</Label>
                      <Input
                        id="cargo-novo"
                        name="cargo"
                        placeholder="Ex: Operador de Limpeza, Supervisor..."
                        value={novoColaboradorCargo}
                        onChange={e => setNovoColaboradorCargo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dia-folga-novo">Dia de Folga</Label>
                      <Select
                        value={novoColaboradorDiaFolga}
                        onValueChange={setNovoColaboradorDiaFolga}
                      >
                        <SelectTrigger id="dia-folga-novo">
                          <SelectValue placeholder="Selecione o dia de folga (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">
                            Sem folga definida
                          </SelectItem>
                          <SelectItem value="0">Domingo</SelectItem>
                          <SelectItem value="1">Segunda-feira</SelectItem>
                          <SelectItem value="2">Terça-feira</SelectItem>
                          <SelectItem value="3">Quarta-feira</SelectItem>
                          <SelectItem value="4">Quinta-feira</SelectItem>
                          <SelectItem value="5">Sexta-feira</SelectItem>
                          <SelectItem value="6">Sábado</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Dia da semana em que o colaborador não precisa bater
                        ponto
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="foto-cracha-novo">Foto para Crachá</Label>
                      <Input
                        id="foto-cracha-novo"
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              toast.error(
                                'Por favor, selecione uma imagem válida'
                              );
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('A imagem deve ter menos de 5MB');
                              return;
                            }
                            setNovoColaboradorFotoCracha(file);
                          }
                        }}
                      />
                      {novoColaboradorFotoCracha && (
                        <p className="text-xs text-muted-foreground">
                          Foto selecionada: {novoColaboradorFotoCracha.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Foto profissional para o crachá do colaborador
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Salvar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Importar Planilha Mercantil */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Importar</Button>
              </DialogTrigger>
              <DialogContent a11yTitle="Importar colaboradores da planilha">
                <DialogHeader>
                  <DialogTitle>Importar Planilha</DialogTitle>
                  <DialogDescription>
                    Importe colaboradores da planilha Excel. O sistema irá
                    identificar automaticamente o grupo e as unidades através de
                    matching inteligente.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    const submitBtn = form.querySelector(
                      'button[type="submit"]'
                    ) as HTMLButtonElement;
                    if (submitBtn) {
                      submitBtn.disabled = true;
                      submitBtn.textContent = 'Importando...';
                    }
                    try {
                      const r = await fetch(
                        '/api/funcionarios/import-mercantil',
                        {
                          method: 'POST',
                          body: fd,
                        }
                      );
                      const j = await r.json();
                      if (!r.ok) {
                        alert(j?.error || 'Falha na importação');
                      } else {
                        const unmatched = j.unmatched?.length || 0;
                        let msg = `✅ Importação concluída!\n\nCriados: ${j.criados}\nAtualizados: ${j.atualizados}`;
                        if (unmatched > 0) {
                          msg += `\n\n ${unmatched} unidade(s) não encontrada(s) - verifique os detalhes`;
                        }
                        alert(msg);
                      }
                      form.reset();
                      router.refresh();
                    } catch (error) {
                      alert('Erro ao importar: ' + (error as Error).message);
                    } finally {
                      if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Importar';
                      }
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Arquivo Excel (.xls ou .xlsx)
                    </label>
                    <input
                      type="file"
                      name="file"
                      accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      required
                      className="w-full border px-2 py-2 rounded"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <strong>Como funciona:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        Importa apenas linhas com código de 3 dígitos (coluna A)
                      </li>
                      <li>Nome completo vem da coluna E</li>
                      <li>CPF vem da coluna AC</li>
                      <li>
                        Identifica automaticamente grupo e unidade pelas linhas
                        &quot;Servico:&quot;
                      </li>
                      <li>
                        Faz matching inteligente de unidades (ex: &quot;CENTRO
                        LAURO DE FREITAS&quot; → &quot;Lauro de Freitas&quot;)
                      </li>
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="outline">
                      Importar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Dialog forms moved to header actions above */}

      {/* Solicitações de Exclusão Pendentes (apenas MASTER) */}
      {canApproveExclusao && solicitacoesExclusao.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Solicitações de Exclusão Pendentes ({solicitacoesExclusao.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {solicitacoesExclusao.map((solicitacao: any) => (
                <div
                  key={solicitacao.id}
                  className="flex items-center justify-between p-3 bg-white rounded border border-yellow-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold">
                      {solicitacao.funcionario.nome}
                    </p>
                    <p className="text-sm text-gray-600">
                      Grupo: {solicitacao.funcionario.grupo?.nome || 'N/A'} |{' '}
                      Unidade: {solicitacao.funcionario.unidade?.nome || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Solicitado por: {solicitacao.solicitadoPor.name} em{' '}
                      {new Date(solicitacao.createdAt).toLocaleDateString(
                        'pt-BR'
                      )}
                      {solicitacao.motivo && (
                        <>
                          <br />
                          Motivo: {solicitacao.motivo}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => processarAprovacao(solicitacao.id, true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => processarAprovacao(solicitacao.id, false)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Forçar refresh da lista
                router.refresh();
                // Também recarregar via fetch
                (async () => {
                  const funcsRes = await fetch('/api/funcionarios?' + qs);
                  const funcs = await funcsRes.json().catch(() => []);
                  setRows(Array.isArray(funcs?.rows) ? funcs.rows : funcs);
                })();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
          <div className="flex gap-2 items-center flex-wrap mt-4">
            <Input
              placeholder="Buscar colaborador"
              defaultValue={q}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = normName((e.target as HTMLInputElement).value);
                  const p = new URLSearchParams(sp.toString());
                  if (v) p.set('q', v);
                  else p.delete('q');
                  router.push('/rh/colaboradores?' + p.toString());
                }
              }}
              className="w-80"
            />
            <Select value={grupoFiltro} onValueChange={handleGrupoFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os grupos</SelectItem>
                {grupos.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={unidadeFiltro} onValueChange={handleUnidadeFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas as unidades</SelectItem>
                <SelectItem value="__none">Sem unidade</SelectItem>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('nome')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Nome
                    {sortBy === 'nome' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </TableHead>
                <TableHead>CPF</TableHead>
                <TableHead className="w-24">Foto Facial</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('grupo')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Grupo
                    {sortBy === 'grupo' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('unidade')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Unidade
                    {sortBy === 'unidade' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </TableHead>
                {canEdit && <TableHead>Dia de Folga</TableHead>}
                {canEdit && <TableHead>Ações</TableHead>}
                {canSolicitarExclusao && <TableHead>Exclusão</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows || []).map(r => {
                // Garantir que diaFolga sempre existe
                const diaFolga =
                  r.diaFolga !== undefined && r.diaFolga !== null
                    ? r.diaFolga
                    : null;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.nome}</TableCell>
                    <TableCell>
                      {r.cpf
                        ? r.cpf.replace(
                            /(\d{3})(\d{3})(\d{3})(\d{2})/,
                            '$1.$2.$3-$4'
                          )
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setColaboradorFoto(r);
                          setFotoDialogOpen(true);
                        }}
                        className="w-full"
                      >
                        {r.temFotoFacial ? (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Foto
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-1" />
                            Sem Foto
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>{r.grupo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex-1">{r.unidadeNome || '—'}</span>
                        {canEdit && (
                          <Select
                            value={r.unidadeId ?? 'none'}
                            onValueChange={v =>
                              salvarUnidade(r.id, v === 'none' ? null : v)
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Alterar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {unidades.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Select
                          value={
                            diaFolga !== null &&
                            diaFolga !== undefined &&
                            diaFolga >= 0 &&
                            diaFolga <= 6
                              ? String(diaFolga)
                              : '__none'
                          }
                          onValueChange={v => {
                            const diaFolgaValue =
                              v === '__none' || v === '' ? null : parseInt(v);
                            if (
                              diaFolgaValue === null ||
                              (diaFolgaValue >= 0 && diaFolgaValue <= 6)
                            ) {
                              salvarDiaFolga(r.id, diaFolgaValue);
                            }
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Sem folga" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Sem folga</SelectItem>
                            <SelectItem value="0">Domingo</SelectItem>
                            <SelectItem value="1">Segunda</SelectItem>
                            <SelectItem value="2">Terça</SelectItem>
                            <SelectItem value="3">Quarta</SelectItem>
                            <SelectItem value="4">Quinta</SelectItem>
                            <SelectItem value="5">Sexta</SelectItem>
                            <SelectItem value="6">Sábado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => salvarUnidade(r.id, r.unidadeId)}
                        >
                          Salvar
                        </Button>
                      </TableCell>
                    )}
                    {canSolicitarExclusao && (
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setColaboradorParaExcluir(r);
                            setExcluirDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Exclusão */}
      <Dialog open={excluirDialogOpen} onOpenChange={setExcluirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {canApproveExclusao
                ? 'Excluir Colaborador'
                : 'Solicitar Exclusão de Colaborador'}
            </DialogTitle>
            <DialogDescription>
              {canApproveExclusao ? (
                <>
                  Tem certeza que deseja excluir o colaborador{' '}
                  <strong>{colaboradorParaExcluir?.nome}</strong>? Esta ação não
                  pode ser desfeita.
                </>
              ) : (
                <>
                  Você está solicitando a exclusão do colaborador{' '}
                  <strong>{colaboradorParaExcluir?.nome}</strong>. Esta
                  solicitação será enviada para aprovação do ADMIN.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea
                id="motivo"
                value={motivoExclusao}
                onChange={e => setMotivoExclusao(e.target.value)}
                placeholder="Informe o motivo da exclusão..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setColaboradorParaExcluir(null);
                setMotivoExclusao('');
                setExcluirDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={solicitarExclusao}
              disabled={loadingExclusao}
              variant={canApproveExclusao ? 'destructive' : 'default'}
            >
              {loadingExclusao
                ? 'Processando...'
                : canApproveExclusao
                  ? 'Excluir Definitivamente'
                  : 'Solicitar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Foto Facial */}
      <Dialog open={fotoDialogOpen} onOpenChange={setFotoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto Facial - {colaboradorFoto?.nome}</DialogTitle>
            <DialogDescription>
              {colaboradorFoto?.temFotoFacial
                ? 'Foto cadastrada para reconhecimento facial automático'
                : 'Nenhuma foto cadastrada. A foto será cadastrada automaticamente quando o colaborador bater ponto pela primeira vez.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Sempre tentar carregar a foto, mesmo se temFotoFacial for false */}
            {/* Isso garante que se a foto foi cadastrada mas a lista não atualizou, ainda mostra */}
            <FotoFacialViewer funcionarioId={colaboradorFoto?.id || ''} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setColaboradorFoto(null);
                setFotoDialogOpen(false);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para visualizar foto facial
function FotoFacialViewer({ funcionarioId }: { funcionarioId: string }) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!funcionarioId) {
      setLoading(false);
      setError('ID do funcionário não fornecido');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/funcionarios/${funcionarioId}/foto-url`);
        const data = await res.json();
        if (res.ok && data.url) {
          setFotoUrl(data.url);
          setError(null);
        } else {
          // Se retornou 404, significa que realmente não tem foto
          if (res.status === 404) {
            setError(null); // Não é erro, só não tem foto ainda
          } else {
            setError('Erro ao carregar foto');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar foto:', err);
        setError('Erro ao carregar foto');
      } finally {
        setLoading(false);
      }
    })();
  }, [funcionarioId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Carregando foto...</p>
        </div>
      </div>
    );
  }

  if (error && error !== 'ID do funcionário não fornecido') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-300 mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!fotoUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Camera className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-gray-600 mb-2">Nenhuma foto cadastrada ainda</p>
        <p className="text-sm text-gray-500">
          A foto será cadastrada automaticamente quando o colaborador bater
          ponto pela primeira vez usando a selfie obrigatória.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-md mx-auto">
        <img
          src={fotoUrl}
          alt="Foto facial do colaborador"
          className="w-full h-auto rounded-lg border-2 border-gray-200 shadow-md"
          onError={() => setError('Erro ao carregar imagem')}
        />
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p>
          <strong>Como funciona:</strong> Esta foto é usada para reconhecimento
          facial automático. Quando o colaborador bater ponto, o sistema
          detectará automaticamente o rosto e preencherá o CPF sem necessidade
          de digitação.
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <PageInner />
    </Suspense>
  );
}
