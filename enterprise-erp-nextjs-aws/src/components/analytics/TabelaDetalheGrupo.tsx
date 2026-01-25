'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toBRL } from '@/lib/utils/analytics';

type TableRowType = {
  categoria: string;
  unidade: string;
  total: number;
  pct: number;
};

interface TabelaDetalheGrupoProps {
  title?: string;
  data: TableRowType[];
}

export function TabelaDetalheGrupo({
  title = 'Detalhamento por Unidade/Categoria',
  data,
}: TabelaDetalheGrupoProps) {
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const total = sorted.reduce((s, r) => s + r.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Nenhum dado para exibir
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                  <TableHead className="text-right">% do total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.categoria}</TableCell>
                    <TableCell>{row.unidade}</TableCell>
                    <TableCell className="text-right">
                      {toBRL(row.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(row.pct * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-medium">
                    {toBRL(total)}
                  </TableCell>
                  <TableCell className="text-right font-medium">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
