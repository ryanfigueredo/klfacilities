'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
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
import { Label } from '@/components/ui/label';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { hasRouteAccess } from '@/lib/rbac';

const grupoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
});

type Grupo = {
  id: string;
  nome: string;
  _count: {
    movimentos: number;
    unidades: number;
  };
};

type FormData = z.infer<typeof grupoSchema>;

export default function GruposPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as
    | 'MASTER'
    | 'ADMIN'
    | 'RH'
    | 'SUPERVISOR'
    | 'OPERACIONAL'
    | undefined;
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Grupo | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(grupoSchema),
  });

  // MASTER tem acesso total, ADMIN e OPERACIONAL podem editar, RH e SUPERVISOR apenas visualizar
  const canEdit = hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']);
  const canView = hasRouteAccess(userRole, [
    'MASTER',
    'ADMIN',
    'RH',
    'OPERACIONAL',
  ]);
  // OPERACIONAL pode ver o botão mas precisa criar solicitação ao invés de excluir diretamente
  const canDelete = hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']);

  useEffect(() => {
    if (canView) {
      fetchGrupos();
    }
  }, [canView]);

  const fetchGrupos = async () => {
    try {
      const response = await fetch('/api/grupos');
      if (!response.ok) throw new Error('Erro ao buscar dados');
      const json = await response.json();
      const arr = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];
      setGrupos(arr as any);
    } catch (error) {
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const url = editingItem ? `/api/grupos/${editingItem.id}` : '/api/grupos';

      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar');
      }

      toast.success(
        editingItem
          ? 'Grupo atualizado com sucesso'
          : 'Grupo criado com sucesso'
      );

      setIsCreateDialogOpen(false);
      setEditingItem(null);
      reset();
      fetchGrupos();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao salvar grupo'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Se for OPERACIONAL, criar solicitação de exclusão
      if (userRole === 'OPERACIONAL') {
        const response = await fetch('/api/config/solicitacoes-exclusao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'grupo',
            resourceId: id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao solicitar exclusão');
        }

        toast.success('Solicitação de exclusão enviada. Aguardando aprovação do MASTER.');
        return;
      }

      // MASTER e ADMIN podem excluir diretamente
      const response = await fetch(`/api/grupos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir');
      }

      toast.success('Grupo excluído com sucesso');
      fetchGrupos();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao excluir grupo'
      );
    }
  };

  const handleEdit = (item: Grupo) => {
    setEditingItem(item);
    reset({ nome: item.nome });
    setIsCreateDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset();
    setIsCreateDialogOpen(true);
  };

  const filteredGrupos = grupos.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso negado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Grupos</h2>
          <p className="text-muted-foreground">
            Gerencie os grupos para agrupamento de movimentos
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Grupos</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Movimentos</TableHead>
                  <TableHead>Unidades</TableHead>
                  {(canEdit || canDelete) && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrupos.map(item => {
                  const hasReferences = item._count.movimentos > 0;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          {item.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item._count.movimentos}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item._count.unidades || 0}
                        </Badge>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <div className="flex gap-2">
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={hasReferences}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent a11yTitle="Confirmar exclusão">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmar exclusão
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {hasReferences ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-destructive">
                                          <AlertTriangle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Não é possível excluir este grupo
                                          </span>
                                        </div>
                                        <p>
                                          O grupo &quot;{item.nome}&quot; está
                                          sendo utilizado em:
                                        </p>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                          <li>
                                            {item._count.movimentos}{' '}
                                            movimento(s)
                                          </li>
                                        </ul>
                                        <p className="text-sm text-muted-foreground">
                                          Remova todas as referências antes de
                                          excluir o grupo.
                                        </p>
                                      </div>
                                    ) : (
                                      <>
                                        Tem certeza que deseja excluir o grupo
                                        &quot;
                                        {item.nome}&quot;? Esta ação não pode
                                        ser desfeita.
                                      </>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  {!hasReferences && (
                                    <AlertDialogAction
                                      onClick={() => handleDelete(item.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  )}
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent a11yTitle="Grupo">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Grupo</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Ex: Despesas Operacionais"
              />
              {errors.nome && (
                <p className="text-sm text-destructive">
                  {errors.nome.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
