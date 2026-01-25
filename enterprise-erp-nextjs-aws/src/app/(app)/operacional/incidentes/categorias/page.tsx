'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { hasRouteAccess } from '@/lib/rbac';
import { getUrgenciaColor, getUrgenciaLabel, type UrgenciaNivel } from '@/lib/urgencia-helper';

interface CategoriaUrgencia {
  id: string;
  urgenciaNivel: 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAIXA' | 'MUITO_BAIXA';
  nome: string;
  prazoHoras: number;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export default function CategoriasUrgenciaPage() {
  const { data: session, status } = useSession();
  const userRole = session?.user?.role as Role | undefined;

  const canView = hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']);
  const canEdit = hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']);

  const [categorias, setCategorias] = useState<CategoriaUrgencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoriaUrgencia | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    urgenciaNivel: 'NORMAL' as UrgenciaNivel,
    nome: '',
  });

  useEffect(() => {
    if (canView) {
      loadCategorias();
    }
  }, [canView]);

  const loadCategorias = async () => {
    try {
      const response = await fetch('/api/incidentes/categorias-urgencia');
      if (!response.ok) throw new Error('Erro ao carregar categorias');
      const data = await response.json();
      setCategorias(data.categorias || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias de urgência');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (categoria?: CategoriaUrgencia) => {
    if (categoria) {
      setEditing(categoria);
      setForm({
        urgenciaNivel: categoria.urgenciaNivel,
        nome: categoria.nome,
      });
    } else {
      setEditing(null);
      setForm({
        urgenciaNivel: 'NORMAL',
        nome: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditing(null);
    setForm({
      urgenciaNivel: 'NORMAL',
      nome: '',
    });
  };

  const handleSave = async () => {
    if (!form.urgenciaNivel || !form.nome.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editing) {
        const response = await fetch(`/api/incidentes/categorias-urgencia/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar');
        }

        toast.success('Categoria atualizada com sucesso');
      } else {
        const response = await fetch('/api/incidentes/categorias-urgencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar');
        }

        toast.success('Categoria criada com sucesso');
      }

      handleCloseDialog();
      loadCategorias();
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(error.message || 'Erro ao salvar categoria');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/incidentes/categorias-urgencia/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir');
      }

      toast.success('Categoria excluída com sucesso');
      loadCategorias();
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error);
      toast.error(error.message || 'Erro ao excluir categoria');
    } finally {
      setIsDeleting(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6 text-muted-foreground">
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 pb-12 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Categorias de Urgência de Incidentes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie as categorias de urgência. Edite os nomes (ex: &quot;Funcionário Faltou&quot;, &quot;Falta de Insumos&quot;) 
            e configure os prazos de resolução para cada tipo de problema.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      Nenhuma categoria encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map(categoria => (
                    <TableRow key={categoria.id}>
                      <TableCell>
                        <div
                          className={`h-6 w-6 rounded-full ${getUrgenciaColor(categoria.urgenciaNivel)}`}
                          title={getUrgenciaLabel(categoria.urgenciaNivel)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getUrgenciaLabel(categoria.urgenciaNivel)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{categoria.nome}</TableCell>
                      <TableCell>{categoria.prazoHoras}h</TableCell>
                      <TableCell className="text-muted-foreground">
                        {categoria.descricao || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={categoria.ativo ? 'default' : 'secondary'}>
                          {categoria.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(categoria)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(categoria.id)}
                              disabled={isDeleting === categoria.id}
                            >
                              {isDeleting === categoria.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Edite o nome da categoria (ex: &quot;Funcionário Faltou&quot;, &quot;Falta de Insumos&quot;) e configure o prazo de resolução.'
                : 'Crie uma nova categoria de urgência. O nome pode ser descritivo do problema (ex: &quot;Funcionário Faltou&quot;, &quot;Falta de Insumos&quot;).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="urgenciaNivel">Urgência *</Label>
              <Select
                value={form.urgenciaNivel}
                onValueChange={(value) => setForm({ ...form, urgenciaNivel: value as UrgenciaNivel })}
              >
                <SelectTrigger id="urgenciaNivel">
                  <SelectValue placeholder="Selecione o nível de urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICA">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-500" />
                      <span>Crítica</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ALTA">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-orange-500" />
                      <span>Alta</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="NORMAL">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-yellow-500" />
                      <span>Normal</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="BAIXA">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-blue-500" />
                      <span>Baixa</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MUITO_BAIXA">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-gray-500" />
                      <span>Muito Baixa</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                O prazo, descrição e ordem serão calculados automaticamente baseado no nível de urgência selecionado
              </p>
            </div>
            <div>
              <Label htmlFor="nome">Nome da Categoria *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Funcionário Faltou, Falta de Insumos, Problema com Limpeza..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome descritivo do tipo de problema (ex: &quot;Funcionário Faltou&quot;, &quot;Falta de Insumos&quot;)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

