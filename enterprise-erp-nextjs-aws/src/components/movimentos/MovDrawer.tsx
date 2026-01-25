'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Eye, X } from 'lucide-react';

interface MovDrawerProps {
  movimento: {
    id: string;
    tipo: 'RECEITA' | 'DESPESA';
    dataLanc: Date;
    competencia: Date;
    descricao: string;
    grupoId: string | null;
    grupo: { nome: string } | null;
    unidadeId: string | null;
    unidade: { nome: string } | null;
    categoria: string | null;
    subcategoria: string | null;
    centroCusto: string | null;
    documento: string | null;
    formaPagamento: string | null;
    valor: number;
    valorAssinado: number;
    criadoPor: { name: string };
    criadoEm: Date;
  };
  children?: React.ReactNode;
}

export function MovDrawer({ movimento, children }: MovDrawerProps) {
  const [childrenRows, setChildrenRows] = useState<
    Array<{ id: string; descricao: string; dataLanc: string; valor: number }>
  >([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);

  async function loadChildren() {
    if (childrenLoaded) return;
    try {
      const res = await fetch(`/api/movimentos/${movimento.id}/children`);
      if (!res.ok) return;
      const j = await res.json();
      const arr = Array.isArray(j?.data) ? j.data : [];
      setChildrenRows(arr);
      setChildrenLoaded(true);
    } catch {}
  }
  return (
    <Drawer onOpenChange={open => open && loadChildren()}>
      <DrawerTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Ver
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>Detalhes do Movimento</DrawerTitle>
            <DrawerDescription>
              Visualize todas as informações do movimento
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-6 space-y-6">
            {/* Cabeçalho com Tipo e Valor */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    movimento.tipo === 'RECEITA'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {movimento.tipo}
                </span>
                <span className="text-sm text-muted-foreground">
                  Criado por {movimento.criadoPor.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(movimento.valor)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Valor Assinado:{' '}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(movimento.valorAssinado)}
                </div>
              </div>
            </div>

            {/* Informações Principais */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Data de Lançamento
                  </Label>
                  <div className="mt-1 text-sm">
                    {format(movimento.dataLanc, 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Competência
                  </Label>
                  <div className="mt-1 text-sm">
                    {format(movimento.competencia, 'MM/yyyy', { locale: ptBR })}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Grupo
                  </Label>
                  <div className="mt-1 text-sm">
                    {movimento.grupo?.nome || '-'}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Unidade
                  </Label>
                  <div className="mt-1 text-sm">
                    {movimento.unidade?.nome || '-'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Categoria
                  </Label>
                  <div className="mt-1 text-sm">
                    {movimento.categoria || '-'}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Subcategoria
                  </Label>
                  <div className="mt-1 text-sm">
                    {movimento.subcategoria || '-'}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Centro de Custo
                  </Label>
                  <div className="mt-1 text-sm">
                    {movimento.centroCusto || '-'}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Criado em
                  </Label>
                  <div className="mt-1 text-sm">
                    {format(movimento.criadoEm, 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Descrição
              </Label>
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                {movimento.descricao}
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Documento
                </Label>
                <div className="mt-1 text-sm">{movimento.documento || '-'}</div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Forma de Pagamento
                </Label>
                <div className="mt-1 text-sm">
                  {movimento.formaPagamento || '-'}
                </div>
              </div>
            </div>
          </div>

          {childrenRows.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Detalhamento da Folha
              </Label>
              <div className="mt-2 border rounded-md max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childrenRows.map(ch => (
                      <tr key={ch.id} className="border-t">
                        <td className="p-2">{ch.descricao}</td>
                        <td className="p-2">
                          {new Date(ch.dataLanc).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-2 text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(ch.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
