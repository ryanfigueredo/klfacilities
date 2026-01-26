'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  Key,
  Shield,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { hasRouteAccess } from '@/lib/rbac';

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum([
    'MASTER',
    'ADMIN',
    'RH',
    'SUPERVISOR',
    'JURIDICO',
    'OPERACIONAL',
    'LAVAGEM',
    'PLANEJAMENTO_ESTRATEGICO',
  ]),
});

const userUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum([
    'MASTER',
    'ADMIN',
    'RH',
    'SUPERVISOR',
    'JURIDICO',
    'OPERACIONAL',
    'LAVAGEM',
    'PLANEJAMENTO_ESTRATEGICO',
  ]),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type User = {
  id: string;
  name: string;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'RH' | 'SUPERVISOR' | 'JURIDICO' | 'OPERACIONAL' | 'LAVAGEM' | 'PLANEJAMENTO_ESTRATEGICO';
  ativo: boolean;
  createdAt: string;
  _count: {
    movimentos: number;
    auditLogs: number;
  };
};

type FormData = z.infer<typeof userSchema>;
type UpdateFormData = z.infer<typeof userUpdateSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

const roleLabels = {
  MASTER: 'Master',
  ADMIN: 'Administrador',
  RH: 'Recursos Humanos',
  SUPERVISOR: 'Supervisor',
  JURIDICO: 'Jurídico',
  OPERACIONAL: 'Operacional',
  LAVAGEM: 'Lavagem',
  PLANEJAMENTO_ESTRATEGICO: 'Planejamento Estratégico',
};

const roleColors = {
  MASTER: 'destructive',
  ADMIN: 'destructive',
  RH: 'default',
  SUPERVISOR: 'secondary',
  JURIDICO: 'outline',
  OPERACIONAL: 'secondary',
  LAVAGEM: 'secondary',
  PLANEJAMENTO_ESTRATEGICO: 'secondary',
} as const;

export default function UsuariosPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as
    | 'MASTER'
    | 'ADMIN'
    | 'RH'
    | 'SUPERVISOR'
    | undefined;
  const [users, setUsers] = useState<User[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'role';
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc',
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(userSchema),
  });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    setValue: setValueUpdate,
    formState: { errors: errorsUpdate, isSubmitting: isSubmittingUpdate },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(userUpdateSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    reset: resetReset,
    formState: { errors: errorsReset, isSubmitting: isSubmittingReset },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // MASTER tem acesso total, ADMIN pode gerenciar usuários
  const canEdit = hasRouteAccess(userRole, ['MASTER', 'ADMIN']);
  const canView = hasRouteAccess(userRole, ['MASTER', 'ADMIN']);

  const handleSort = (column: 'name' | 'role') => {
    setSortConfig(prev =>
      prev.key === column
        ? { key: column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column, direction: 'asc' }
    );
  };

  const renderSortIcon = (column: 'name' | 'role') => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    );
  };

  useEffect(() => {
    if (canView) {
      fetchUsers();
    }
  }, [canView]);

  const fetchUsers = async () => {
    try {
      // Buscar usuários ativos
      const response = await fetch('/api/usuarios');
      if (!response.ok) throw new Error('Erro ao buscar dados');
      const data = await response.json();
      setUsers(data);

      // Buscar usuários inativos
      const responseInactive = await fetch('/api/usuarios?inativos=true');
      if (responseInactive.ok) {
        const dataInactive = await responseInactive.json();
        setInactiveUsers(dataInactive);
      }
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar');
      }

      toast.success('Usuário criado com sucesso');
      setIsCreateDialogOpen(false);
      reset();
      fetchUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao criar usuário'
      );
    }
  };

  const onSubmitUpdate = async (data: UpdateFormData) => {
    try {
      if (!editingItem) return;

      const response = await fetch(`/api/usuarios/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar');
      }

      toast.success('Usuário atualizado com sucesso');
      setIsCreateDialogOpen(false);
      setEditingItem(null);
      resetUpdate();
      fetchUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao atualizar usuário'
      );
    }
  };

  const onSubmitResetPassword = async (data: ResetPasswordData) => {
    try {
      if (!resettingUser) return;

      const response = await fetch(
        `/api/usuarios/${resettingUser.id}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novaSenha: data.newPassword }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao resetar senha');
      }

      toast.success('Senha resetada com sucesso');
      setIsResetPasswordOpen(false);
      setResettingUser(null);
      resetReset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao resetar senha'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir');
      }

      toast.success('Usuário desativado com sucesso');
      fetchUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao excluir usuário'
      );
    }
  };

  const handleEdit = (item: User) => {
    setEditingItem(item);
    setValueUpdate('name', item.name);
    setValueUpdate('email', item.email);
    setValueUpdate('role', item.role);
    setIsCreateDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset();
    setIsCreateDialogOpen(true);
  };

  const handleResetPassword = (item: User) => {
    setResettingUser(item);
    resetReset();
    setIsResetPasswordOpen(true);
  };

  const currentUsers = showInactive ? inactiveUsers : users;

  const filteredUsers = useMemo(
    () =>
      currentUsers.filter(
        item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.email.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [currentUsers, searchTerm]
  );

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];

    sorted.sort((a, b) => {
      const valueA =
        sortConfig.key === 'name'
          ? a.name.toLowerCase()
          : roleLabels[a.role].toLowerCase();
      const valueB =
        sortConfig.key === 'name'
          ? b.name.toLowerCase()
          : roleLabels[b.role].toLowerCase();

      const compareResult = valueA.localeCompare(valueB, 'pt-BR', {
        sensitivity: 'base',
      });

      return sortConfig.direction === 'asc' ? compareResult : -compareResult;
    });

    return sorted;
  }, [filteredUsers, sortConfig]);

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
          <h2 className="text-xl font-semibold">Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <CardTitle>Lista de Usuários</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={!showInactive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInactive(false)}
              >
                Ativos ({users.length})
              </Button>
              <Button
                variant={showInactive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInactive(true)}
              >
                Inativos ({inactiveUsers.length})
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
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
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 font-semibold text-left"
                    >
                      Nome
                      {renderSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-1 font-semibold text-left"
                    >
                      Função
                      {renderSortIcon('role')}
                    </button>
                  </TableHead>
                  <TableHead>Auditorias</TableHead>
                  <TableHead>Criado em</TableHead>
                  {canEdit && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map(item => {
                  const isLuciano = item.email === 'luciano@kl.com.br';
                  const _count = item._count || { movimentos: 0, auditLogs: 0 };
                  const hasReferences = _count.movimentos > 0;
                  const auditoriaCount = _count.auditLogs ?? 0;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {item.name}
                          {isLuciano && (
                            <Shield className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>
                        <Badge variant={item.ativo ? 'default' : 'secondary'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleColors[item.role]}>
                          {roleLabels[item.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{auditoriaCount}</Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              disabled={isLuciano}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(item)}
                              disabled={isLuciano}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isLuciano || hasReferences}
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
                                    {isLuciano ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-destructive">
                                          <AlertTriangle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Não é possível excluir o usuário
                                            LUCIANO
                                          </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          Este usuário possui proteção especial
                                          no sistema.
                                        </p>
                                      </div>
                                    ) : hasReferences ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-destructive">
                                          <AlertTriangle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Não é possível excluir este usuário
                                          </span>
                                        </div>
                                        <p>
                                          O usuário &quot;{item.name}&quot; está
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
                                          excluir o usuário.
                                        </p>
                                      </div>
                                    ) : (
                                      <>
                                        Tem certeza que deseja excluir o usuário
                                        &quot;{item.name}&quot;? Esta ação não
                                        pode ser desfeita.
                                      </>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  {!isLuciano && !hasReferences && (
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
        <DialogContent a11yTitle="Usuário">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Usuário</DialogTitle>
          </DialogHeader>
          {editingItem ? (
            <form
              onSubmit={handleSubmitUpdate(onSubmitUpdate)}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  {...registerUpdate('name')}
                  placeholder="Nome completo"
                />
                {errorsUpdate.name && (
                  <p className="text-sm text-destructive">
                    {errorsUpdate.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  {...registerUpdate('email')}
                  placeholder="email@exemplo.com"
                />
                {errorsUpdate.email && (
                  <p className="text-sm text-destructive">
                    {errorsUpdate.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                <Select
                  value={watch('role')}
                  onValueChange={value => setValueUpdate('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASTER">Master</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="RH">Recursos Humanos</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="JURIDICO">Jurídico</SelectItem>
                    <SelectItem value="OPERACIONAL">Operacional</SelectItem>
                    <SelectItem value="PLANEJAMENTO_ESTRATEGICO">Planejamento Estratégico</SelectItem>
                  </SelectContent>
                </Select>
                {errorsUpdate.role && (
                  <p className="text-sm text-destructive">
                    {errorsUpdate.role.message}
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
                <Button type="submit" disabled={isSubmittingUpdate}>
                  {isSubmittingUpdate ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Nome completo"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  {...register('email')}
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Mínimo 6 caracteres"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                <Select
                  value={watch('role')}
                  onValueChange={value => setValue('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASTER">Master</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="RH">Recursos Humanos</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="JURIDICO">Jurídico</SelectItem>
                    <SelectItem value="OPERACIONAL">Operacional</SelectItem>
                    <SelectItem value="PLANEJAMENTO_ESTRATEGICO">Planejamento Estratégico</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">
                    {errors.role.message}
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
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent a11yTitle="Resetar Senha">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
          </DialogHeader>
          {resettingUser && (
            <form
              onSubmit={handleSubmitReset(onSubmitResetPassword)}
              className="space-y-4"
            >
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Usuário:</strong> {resettingUser.name} (
                  {resettingUser.email})
                </p>
              </div>
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerReset('newPassword')}
                  placeholder="Mínimo 6 caracteres"
                />
                {errorsReset.newPassword && (
                  <p className="text-sm text-destructive">
                    {errorsReset.newPassword.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetPasswordOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmittingReset}>
                  {isSubmittingReset ? 'Resetando...' : 'Resetar Senha'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
