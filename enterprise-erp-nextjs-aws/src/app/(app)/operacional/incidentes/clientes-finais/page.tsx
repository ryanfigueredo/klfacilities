'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { hasRouteAccess } from '@/lib/rbac';

interface ClienteFinal {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  unidadeId: string | null;
  ativo: boolean;
  createdAt: string;
  grupos: Array<{
    grupo: {
      id: string;
      nome: string;
    };
  }>;
  unidade: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
  } | null;
}

interface Grupo {
  id: string;
  nome: string;
}

interface Unidade {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  grupoId?: string;
}

export default function ClientesFinaisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role as Role | undefined;

  const [clientesFinais, setClientesFinais] = useState<ClienteFinal[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    grupoIds: [] as string[],
    unidadeId: '',
    ativo: true,
  });
  const [saving, setSaving] = useState(false);

  const canAccess = hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']);

  useEffect(() => {
    if (status === 'loading') return;
    if (!canAccess) {
      router.push('/unauthorized');
      return;
    }
    loadData();
  }, [status, canAccess, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientesRes, gruposRes] = await Promise.all([
        fetch('/api/chamados/clientes-finais'),
        fetch('/api/grupos'),
      ]);

      if (clientesRes.ok) {
        const clientesData = await clientesRes.json();
        setClientesFinais(clientesData.data || []);
      }

      if (gruposRes.ok) {
        const gruposData = await gruposRes.json();
        setGrupos(Array.isArray(gruposData?.data) ? gruposData.data : []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadUnidades = async (grupoIds: string[]) => {
    if (!grupoIds || grupoIds.length === 0) {
      setUnidades([]);
      return;
    }

    try {
      // Buscar unidades de todos os grupos selecionados
      const unidadesSet = new Map<string, Unidade>();
      
      for (const grupoId of grupoIds) {
        const res = await fetch(`/api/unidades?grupoId=${grupoId}`);
        if (res.ok) {
          const data = await res.json();
          const unidadesGrupo = Array.isArray(data?.data) ? data.data : [];
          unidadesGrupo.forEach((u: Unidade) => {
            if (!unidadesSet.has(u.id)) {
              unidadesSet.set(u.id, { ...u, grupoId: grupoId });
            }
          });
        }
      }
      
      setUnidades(Array.from(unidadesSet.values()));
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  };

  useEffect(() => {
    if (formData.grupoIds && formData.grupoIds.length > 0) {
      loadUnidades(formData.grupoIds);
    } else {
      setUnidades([]);
      setFormData(prev => ({ ...prev, unidadeId: '' }));
    }
  }, [formData.grupoIds]);

  const handleOpenDialog = (cliente?: ClienteFinal) => {
    if (cliente) {
      setEditingId(cliente.id);
      const grupoIds = cliente.grupos?.map(cfg => cfg.grupo.id) || [];
      setFormData({
        nome: cliente.nome,
        email: cliente.email,
        whatsapp: cliente.whatsapp || '',
        grupoIds: grupoIds,
        unidadeId: cliente.unidadeId || '',
        ativo: cliente.ativo,
      });
      if (grupoIds.length > 0) {
        loadUnidades(grupoIds);
      }
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        email: '',
        whatsapp: '',
        grupoIds: [],
        unidadeId: '',
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.email.trim()) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/chamados/clientes-finais/${editingId}`
        : '/api/chamados/clientes-finais';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          whatsapp: formData.whatsapp.trim() || null,
          grupoIds: formData.grupoIds,
          unidadeId: formData.unidadeId && formData.unidadeId !== '__none__' ? formData.unidadeId : null,
          ativo: formData.ativo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar cliente final');
      }

      toast.success(
        editingId
          ? 'Cliente final atualizado com sucesso!'
          : 'Cliente final criado com sucesso!'
      );
      setDialogOpen(false);
      loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao salvar cliente final';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este cliente final?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chamados/clientes-finais/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar cliente final');
      }

      toast.success('Cliente final deletado com sucesso!');
      loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao deletar cliente final';
      toast.error(errorMessage);
    }
  };

  const handleToggleAtivo = async (cliente: ClienteFinal) => {
    try {
      const response = await fetch(
        `/api/chamados/clientes-finais/${cliente.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ativo: !cliente.ativo,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      toast.success(
        cliente.ativo
          ? 'Cliente final desativado com sucesso!'
          : 'Cliente final ativado com sucesso!'
      );
      loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao atualizar status';
      toast.error(errorMessage);
    }
  };

  const filteredClientes = clientesFinais.filter(cliente => {
    const matchesSearch =
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterAtivo === 'all' ||
      (filterAtivo === 'ativo' && cliente.ativo) ||
      (filterAtivo === 'inativo' && !cliente.ativo);
    return matchesSearch && matchesFilter;
  });

  if (status === 'loading' || !canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes Finais</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os emails autorizados a abrir chamados na página pública
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente Final
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Label htmlFor="filter">Status</Label>
              <Select value={filterAtivo} onValueChange={setFilterAtivo}>
                <SelectTrigger id="filter" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum cliente final encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map(cliente => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">
                        {cliente.nome}
                      </TableCell>
                      <TableCell>{cliente.email}</TableCell>
                      <TableCell>
                        {cliente.whatsapp || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.grupos && cliente.grupos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cliente.grupos.map((cfg, idx) => (
                              <Badge key={idx} variant="outline">
                                {cfg.grupo.nome}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.unidade ? (
                          <div>
                            <div className="font-medium">
                              {cliente.unidade.nome}
                            </div>
                            {cliente.unidade.cidade && cliente.unidade.estado && (
                              <div className="text-xs text-muted-foreground">
                                {cliente.unidade.cidade}/{cliente.unidade.estado}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cliente.ativo ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                          <Switch
                            checked={cliente.ativo}
                            onCheckedChange={() => handleToggleAtivo(cliente)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(cliente)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(cliente.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Cliente Final' : 'Novo Cliente Final'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize as informações do cliente final'
                : 'Cadastre um novo email autorizado a abrir chamados'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={e =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@exemplo.com"
                  required
                  disabled={!!editingId}
                />
                {editingId && (
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={e =>
                  setFormData({ ...formData, whatsapp: e.target.value })
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Grupos (opcional - selecione múltiplos)</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                  {grupos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum grupo disponível</p>
                  ) : (
                    <div className="space-y-2">
                      {grupos.map(grupo => {
                        const isChecked = formData.grupoIds.includes(grupo.id);
                        return (
                          <div key={grupo.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`grupo-${grupo.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    grupoIds: [...formData.grupoIds, grupo.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    grupoIds: formData.grupoIds.filter(id => id !== grupo.id),
                                  });
                                }
                              }}
                            />
                            <label
                              htmlFor={`grupo-${grupo.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {grupo.nome}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione um ou mais grupos. O cliente verá todas as unidades dos grupos selecionados ao abrir um chamado.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade (opcional)</Label>
                <Select
                  value={formData.unidadeId || '__none__'}
                  onValueChange={value =>
                    setFormData({ ...formData, unidadeId: value === '__none__' ? '' : value })
                  }
                  disabled={formData.grupoIds.length === 0}
                >
                  <SelectTrigger id="unidade">
                    <SelectValue
                      placeholder={
                        formData.grupoIds.length === 0
                          ? 'Selecione primeiro pelo menos um grupo'
                          : 'Selecione a unidade (opcional)'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {unidades.map(unidade => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                        {unidade.cidade && unidade.estado
                          ? ` - ${unidade.cidade}/${unidade.estado}`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se selecionada, o cliente só verá esta unidade específica. Caso contrário, verá todas as unidades dos grupos selecionados.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={checked =>
                  setFormData({ ...formData, ativo: checked })
                }
              />
              <Label htmlFor="ativo" className="cursor-pointer">
                Cliente ativo (pode abrir chamados)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingId ? (
                'Atualizar'
              ) : (
                'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

