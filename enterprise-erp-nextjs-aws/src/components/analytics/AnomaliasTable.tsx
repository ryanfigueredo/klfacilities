'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnomalias, analyticsKeys } from '@/hooks/useAnalyticsQueries';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { toBRL } from '@/lib/utils/analytics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, FileText } from 'lucide-react';
import { MovDetailSheet } from './MovDetailSheet';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function AnomaliasTable() {
  const { filters } = useAnalyticsFilters();
  const { data, isLoading, error } = useAnomalias(filters);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const onView = (id: string) => {
    setSelectedId(id);
    setOpen(true);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const autoSelectExtras = () => {
    if (!data?.duplicidades?.length) return;
    // Agrupa por chave simples: descricao + data (dia) + valor absoluto
    const groups = new Map<string, any[]>();
    for (const it of data.duplicidades) {
      const key = `${(it.descricao || '').trim().toUpperCase()}|${new Date(it.dataLanc).toISOString().slice(0, 10)}|${Math.abs(Number(it.valor || 0)).toFixed(2)}`;
      const arr = groups.get(key) || [];
      arr.push(it);
      groups.set(key, arr);
    }
    const next = new Set<string>();
    for (const [, arr] of groups) {
      if (arr.length <= 1) continue;
      // mantém o primeiro, seleciona os demais para exclusão
      const sorted = [...arr];
      // opcional: ordena por valor id para manter consistência
      sorted.sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
      for (let i = 1; i < sorted.length; i++) next.add(sorted[i].id);
    }
    setSelectedIds(next);
  };

  const selectedCount = selectedIds.size;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anomalias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anomalias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Erro ao carregar anomalias</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Anomalias Detectadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="duplicidades" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="duplicidades">
              Duplicados ({data.duplicidades.length})
            </TabsTrigger>
            <TabsTrigger value="semCategoria">
              Sem Categoria ({data.semCategoria.length})
            </TabsTrigger>
            <TabsTrigger value="outliers">
              Outliers ({data.outliers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="duplicidades" className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">
                {data.duplicidades.length} potenciais duplicados
                {selectedCount ? ` • selecionados: ${selectedCount}` : ''}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={autoSelectExtras}>
                  Selecionar duplicados (auto)
                </Button>
                <ConfirmDialog
                  title="Excluir selecionados"
                  description="Iremos excluir os lançamentos selecionados. Esta ação não pode ser desfeita."
                  onConfirm={async () => {
                    try {
                      const ids = Array.from(selectedIds);
                      for (const id of ids) {
                        const r = await fetch(
                          `/api/movimentos?id=${encodeURIComponent(id)}`,
                          { method: 'DELETE' }
                        );
                        if (!r.ok) {
                          const err = await r.json().catch(() => ({}));
                          throw new Error(err?.error || 'Falha ao excluir');
                        }
                      }
                      setSelectedIds(new Set());
                      toast.success('Duplicados excluídos');
                      await queryClient.invalidateQueries({
                        queryKey: analyticsKeys.anomalias(filters),
                      });
                    } catch (e: any) {
                      toast.error(e?.message || 'Erro ao excluir');
                    }
                  }}
                >
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!selectedCount}
                  >
                    Excluir selecionados
                  </Button>
                </ConfirmDialog>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <input
                        type="checkbox"
                        aria-label="Selecionar todos"
                        onChange={e => {
                          if (!data?.duplicidades?.length) return;
                          if (e.target.checked) {
                            setSelectedIds(
                              new Set(data.duplicidades.map((x: any) => x.id))
                            );
                          } else setSelectedIds(new Set());
                        }}
                      />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Ocorrências</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.duplicidades.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Nenhuma duplicidade encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.duplicidades.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={e =>
                              toggleSelect(item.id, e.target.checked)
                            }
                            aria-label={`Selecionar ${item.descricao}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.descricao}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.dataLanc), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>{toBRL(item.valor)}</TableCell>
                        <TableCell>
                          {item.categoria || (
                            <Badge variant="destructive">Sem categoria</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.count}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={e => {
                                e.stopPropagation();
                                onView(item.id);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            {item.count >= 2 && (
                              <ConfirmDialog
                                title="Excluir movimento duplicado"
                                description="Essa ação marcará o movimento como excluído e não poderá ser desfeita. Deseja continuar?"
                                onConfirm={async () => {
                                  try {
                                    const r = await fetch(
                                      `/api/movimentos?id=${encodeURIComponent(item.id)}`,
                                      {
                                        method: 'DELETE',
                                      }
                                    );
                                    if (!r.ok) {
                                      const err = await r
                                        .json()
                                        .catch(() => ({}));
                                      throw new Error(
                                        err?.error || 'Falha ao excluir'
                                      );
                                    }
                                    toast.success('Movimento excluído');
                                    // Atualiza somente os dados necessários
                                    await queryClient.invalidateQueries({
                                      queryKey:
                                        analyticsKeys.anomalias(filters),
                                    });
                                  } catch (e: any) {
                                    toast.error(
                                      e?.message || 'Erro ao excluir'
                                    );
                                  }
                                }}
                              >
                                <Button size="sm" variant="destructive">
                                  Excluir
                                </Button>
                              </ConfirmDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="semCategoria" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.semCategoria.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum movimento sem categoria encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.semCategoria.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.descricao}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.dataLanc), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>{toBRL(item.valor)}</TableCell>
                        <TableCell>{item.grupo || '-'}</TableCell>
                        <TableCell>{item.unidade || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={e => {
                                e.stopPropagation();
                                onView(item.id);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <ConfirmDialog
                              title="Excluir movimento"
                              description="Essa ação marcará o movimento como excluído e não poderá ser desfeita. Deseja continuar?"
                              onConfirm={async () => {
                                try {
                                  const r = await fetch(
                                    `/api/movimentos?id=${encodeURIComponent(item.id)}`,
                                    { method: 'DELETE' }
                                  );
                                  if (!r.ok) {
                                    const err = await r
                                      .json()
                                      .catch(() => ({}));
                                    throw new Error(
                                      err?.error || 'Falha ao excluir'
                                    );
                                  }
                                  toast.success('Movimento excluído');
                                  await queryClient.invalidateQueries({
                                    queryKey: analyticsKeys.anomalias(filters),
                                  });
                                } catch (e: any) {
                                  toast.error(e?.message || 'Erro ao excluir');
                                }
                              }}
                            >
                              <Button size="sm" variant="destructive">
                                Excluir
                              </Button>
                            </ConfirmDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="outliers" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Z-Score</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.outliers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum outlier encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.outliers.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.descricao}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.dataLanc), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>{toBRL(item.valor)}</TableCell>
                        <TableCell>{item.categoria || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.zScore > 3 ? 'destructive' : 'outline'
                            }
                          >
                            {item.zScore.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={e => {
                              e.stopPropagation();
                              onView(item.id);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        <MovDetailSheet open={open} onOpenChange={setOpen} movId={selectedId} />
      </CardContent>
    </Card>
  );
}
