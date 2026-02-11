'use client';

import { useEffect, useMemo, useState, Suspense, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Pencil,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Row = {
  id: string;
  nome: string;
  cpf: string | null;
  grupo: string;
  grupoId?: string;
  unidadeId: string | null;
  unidadeNome: string | null;
  unidadeIds?: string[];
  unidadeNomes?: string[];
  fotoUrl: string | null;
  temFotoFacial: boolean;
  temCracha: boolean;
  fotoCracha: string | null;
  cargo: string | null;
  diaFolga: number | null;
  excluidoEm?: string | null;
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
    'SUPERVISOR',
  ]); // MASTER, RH e Supervisor podem criar/editar (Supervisor não pode excluir)
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
  const isAdmin = session?.user?.role === 'ADMIN';
  // Excluir/aprovar exclusão: apenas RH Master (MASTER), RH ou Administrador — Supervisor não pode excluir
  const canApproveExclusao = isMaster || isRH || isAdmin;
  const canSolicitarExclusao = canApproveExclusao;

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
  // Dialog Editar Colaborador (edição completa)
  const [editarColaborador, setEditarColaborador] = useState<Row | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editGrupoId, setEditGrupoId] = useState('');
  const [editUnidadeIds, setEditUnidadeIds] = useState<string[]>([]);
  const [editCargo, setEditCargo] = useState('');
  const [editDiaFolga, setEditDiaFolga] = useState<string>('');
  const [editUnidadesFiltradas, setEditUnidadesFiltradas] = useState<
    { id: string; nome: string }[]
  >([]);
  const [loadingEditar, setLoadingEditar] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [inativosRows, setInativosRows] = useState<Row[]>([]);

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
    // Carregar inativos/demitidos (mesma página, seção separada)
    if (canView) {
      const inativosQs = (qs ? qs + '&' : '') + 'inativos=true';
      fetch('/api/funcionarios?' + inativosQs)
        .then(res => res.json().catch(() => ({})))
        .then(data => {
          const list = Array.isArray(data?.rows) ? data.rows : [];
          setInativosRows(list.map((f: any) => ({ ...f, diaFolga: f.diaFolga ?? null })));
        })
        .catch(() => setInativosRows([]));
    }
  }, [qs, canView, canApproveExclusao, listRefreshKey]);

  async function salvarUnidade(
    id: string,
    unidadeId: string | null,
    novoUnidadeNome?: string
  ): Promise<boolean> {
    if (!canEdit) return false;
    try {
      const res = await fetch('/api/funcionarios/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unidadeId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erro ao atualizar unidade');
        return false;
      }
      toast.success('Unidade atualizada');
      // Atualização imediata na lista para o colaborador editado
      if (novoUnidadeNome !== undefined) {
        setRows(prev =>
          prev.map(row =>
            row.id === id
              ? { ...row, unidadeId, unidadeNome: novoUnidadeNome }
              : row
          )
        );
      } else {
        router.refresh();
      }
      return true;
    } catch (e) {
      toast.error('Erro ao atualizar unidade');
      return false;
    }
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

  async function salvarCargo(id: string, cargo: string | null) {
    if (!canEdit) return;
    try {
      const res = await fetch('/api/funcionarios/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo: cargo?.trim() || null }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro ao salvar cargo');
        return;
      }
      toast.success('Cargo atualizado');
      router.refresh();
    } catch (error) {
      console.error('Erro ao salvar cargo:', error);
      toast.error('Erro ao salvar cargo');
    }
  }

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

  // Carregar unidades do grupo ao editar colaborador
  useEffect(() => {
    if (!editarColaborador || !editGrupoId) {
      setEditUnidadesFiltradas([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/mapeamento?grupoId=${encodeURIComponent(editGrupoId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setEditUnidadesFiltradas(
            Array.isArray(data.unidades) ? data.unidades : []
          );
        } else {
          setEditUnidadesFiltradas([]);
        }
      } catch {
        setEditUnidadesFiltradas([]);
      }
    })();
  }, [editarColaborador, editGrupoId]);

  const toggleEditUnidade = (unidadeId: string) => {
    setEditUnidadeIds(prev =>
      prev.includes(unidadeId)
        ? prev.filter(id => id !== unidadeId)
        : [...prev, unidadeId]
    );
  };

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
        setListRefreshKey(k => k + 1);
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
            Controle de colaboradores: vincule às unidades, edite e exclua. RH decide exclusões — sem aprovação extra.
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
          </div>
        )}
      </div>

      {/* Dialog forms moved to header actions above */}

      {/* Solicitações de Exclusão Pendentes (quando outro perfil solicitou e RH precisa aprovar) */}
      {canApproveExclusao && solicitacoesExclusao.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Solicitações de exclusão pendentes de aprovação ({solicitacoesExclusao.length})
            </CardTitle>
            <p className="text-sm text-yellow-700 mt-1">
              Quem tem RH/Admin exclui direto na lista. Aqui aparecem pedidos de outros solicitantes.
            </p>
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
                setListRefreshKey(k => k + 1);
                router.refresh();
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
                <TableHead>Cargo</TableHead>
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
                {canEdit && <TableHead>Ações</TableHead>}
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
                    <TableCell>{r.grupo}</TableCell>
                    <TableCell>{r.cargo || '—'}</TableCell>
                    <TableCell>
                      {r.unidadeNomes?.length
                        ? r.unidadeNomes.join(', ')
                        : r.unidadeNome || '—'}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditarColaborador(r);
                              setEditNome(r.nome);
                              setEditCpf(
                                r.cpf
                                  ? r.cpf.replace(
                                      /(\d{3})(\d{3})(\d{3})(\d{2})/,
                                      '$1.$2.$3-$4'
                                    )
                                  : ''
                              );
                              setEditGrupoId(r.grupoId || '');
                              setEditUnidadeIds(
                                r.unidadeIds?.length
                                  ? r.unidadeIds
                                  : r.unidadeId
                                    ? [r.unidadeId]
                                    : []
                              );
                              setEditCargo(r.cargo || '');
                              setEditDiaFolga(
                                diaFolga !== null && diaFolga >= 0 && diaFolga <= 6
                                  ? String(diaFolga)
                                  : '__none'
                              );
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canSolicitarExclusao && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setColaboradorParaExcluir(r);
                                setExcluirDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inativos / Demitidos — registros preservados para uso jurídico */}
      {inativosRows.length > 0 && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle>Inativos / Demitidos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Colaboradores excluídos. Os registros de ponto são mantidos para fins jurídicos.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Data da exclusão</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inativosRows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.nome}</TableCell>
                    <TableCell>{r.grupo}</TableCell>
                    <TableCell>
                      {r.unidadeNomes?.length
                        ? r.unidadeNomes.join(', ')
                        : r.unidadeNome || '—'}
                    </TableCell>
                    <TableCell>
                      {r.excluidoEm
                        ? new Date(r.excluidoEm).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/ponto/admin/registros?funcionarioId=${r.id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Ver registros de ponto
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Exclusão — RH/MASTER/ADMIN excluem direto, sem aprovação */}
      <Dialog open={excluirDialogOpen} onOpenChange={setExcluirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {canApproveExclusao
                ? 'Excluir colaborador'
                : 'Solicitar Exclusão de Colaborador'}
            </DialogTitle>
            <DialogDescription>
              {canApproveExclusao ? (
                <>
                  Excluir <strong>{colaboradorParaExcluir?.nome}</strong> da
                  lista de ativos. O colaborador passará para a seção
                  &quot;Inativos / Demitidos&quot; e os registros de ponto
                  serão mantidos para fins jurídicos.
                </>
              ) : (
                <>
                  Você está solicitando a exclusão do colaborador{' '}
                  <strong>{colaboradorParaExcluir?.nome}</strong>. Esta
                  solicitação será enviada para aprovação do RH/Administrador.
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
                placeholder="Ex.: desligamento, demissão..."
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
                  ? 'Excluir'
                  : 'Solicitar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Colaborador */}
      <Dialog
        open={!!editarColaborador}
        onOpenChange={open => {
          if (!open) setEditarColaborador(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Altere nome, CPF, grupo, unidade, cargo ou dia de folga.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 py-2"
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (!editarColaborador) return;
              setLoadingEditar(true);
              try {
                const cpfLimpo = editCpf.replace(/\D/g, '').trim() || null;
                const diaFolgaValue =
                  editDiaFolga === '__none' || editDiaFolga === ''
                    ? null
                    : parseInt(editDiaFolga, 10);
                const res = await fetch(
                  '/api/funcionarios/' + editarColaborador.id,
                  {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nome: editNome.trim(),
                      cpf: cpfLimpo,
                      grupoId: editGrupoId || undefined,
                      unidadeIds: editUnidadeIds,
                      cargo: editCargo.trim() || null,
                      diaFolga:
                        diaFolgaValue !== null &&
                        diaFolgaValue >= 0 &&
                        diaFolgaValue <= 6
                          ? diaFolgaValue
                          : null,
                    }),
                  }
                );
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(data.error || 'Erro ao salvar');
                  return;
                }
                toast.success('Colaborador atualizado');
                setEditarColaborador(null);
                setListRefreshKey(k => k + 1);
                router.refresh();
              } catch (err) {
                toast.error('Erro ao salvar');
              } finally {
                setLoadingEditar(false);
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cpf">CPF</Label>
                <Input
                  id="edit-cpf"
                  value={editCpf}
                  onChange={e => setEditCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-grupo">Grupo</Label>
                <Select
                  value={editGrupoId}
                  onValueChange={v => {
                    setEditGrupoId(v);
                    setEditUnidadeIds([]);
                  }}
                >
                  <SelectTrigger id="edit-grupo">
                    <SelectValue placeholder="Grupo" />
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Unidades (pode bater ponto em qualquer uma)</Label>
                <p className="text-xs text-muted-foreground">
                  Marque todas as unidades onde o colaborador pode registrar ponto.
                </p>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {!editGrupoId ? (
                    <span className="text-sm text-muted-foreground">
                      Selecione o grupo primeiro
                    </span>
                  ) : editUnidadesFiltradas.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      Nenhuma unidade neste grupo
                    </span>
                  ) : (
                    editUnidadesFiltradas.map(u => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editUnidadeIds.includes(u.id)}
                          onChange={() => toggleEditUnidade(u.id)}
                          className="rounded border-input"
                        />
                        <span className="text-sm">{u.nome}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cargo">Cargo</Label>
                <Input
                  id="edit-cargo"
                  value={editCargo}
                  onChange={e => setEditCargo(e.target.value)}
                  placeholder="Ex: ASG, Encarregado..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-diafolga">Dia de Folga</Label>
                <Select
                  value={editDiaFolga}
                  onValueChange={setEditDiaFolga}
                >
                  <SelectTrigger id="edit-diafolga">
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
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditarColaborador(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loadingEditar}>
                {loadingEditar ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
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
