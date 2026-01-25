'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

type PreviewRow = {
  nome: string;
  valor: number;
  data?: string; // yyyy-MM-dd
  enabled: boolean;
};

function normalize(s: string): string {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function parseBRL(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const s = String(value)
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function excelDateToISO(d: any): string | undefined {
  if (d == null || d === '') return undefined;
  if (typeof d === 'number') {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = d * 86400000;
    const dt = new Date(epoch.getTime() + ms);
    return dt.toISOString().slice(0, 10);
  }
  const asStr = String(d).trim();
  // Try dd/MM/yyyy[ HH:mm[:ss]] or dd/MM/yy
  const m = asStr.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1; // JS months são 0-based
    const year = parseInt(m[3].length === 2 ? '20' + m[3] : m[3], 10);
    const hh = m[4] ? parseInt(m[4], 10) : 12;
    const mm = m[5] ? parseInt(m[5], 10) : 0;
    const ss = m[6] ? parseInt(m[6], 10) : 0;
    const dt = new Date(Date.UTC(year, mon, day, hh, mm, ss, 0));
    return dt.toISOString().slice(0, 10);
  }
  // Fallback
  const dt = new Date(asStr);
  if (!isNaN(dt.getTime()))
    return new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12)
    )
      .toISOString()
      .slice(0, 10);
  return undefined;
}

export default function FolhaImportDialog({ open, onOpenChange }: Props) {
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [valorTotal, setValorTotal] = useState<string>('');
  const [grupoId, setGrupoId] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [formaPag, setFormaPag] = useState<string>('SOMAPAY');
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string }>>([]);
  const [categorias, setCategorias] = useState<
    Array<{ id: string; nome: string }>
  >([]);
  // Removido seletor de formato por solicitação; assumimos dd/MM/yyyy no Excel

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [g, c] = await Promise.all([
          fetch('/api/grupos')
            .then(r => r.json())
            .catch(() => ({})),
          fetch('/api/categorias?tipo=DESPESA')
            .then(r => r.json())
            .catch(() => ({})),
        ]);
        const gs = Array.isArray(g?.data) ? g.data : Array.isArray(g) ? g : [];
        const cs = Array.isArray(c?.data) ? c.data : Array.isArray(c) ? c : [];
        setGrupos(gs);
        setCategorias(cs);
      } catch {}
    })();
  }, [open]);

  const somaSelecionada = useMemo(
    () =>
      rows.filter(r => r.enabled).reduce((acc, r) => acc + (r.valor || 0), 0),
    [rows]
  );

  const mostCommonDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (!r.enabled || !r.data) continue;
      map.set(r.data, (map.get(r.data) || 0) + 1);
    }
    let best: string | undefined;
    let max = 0;
    for (const [d, c] of map.entries()) {
      if (c > max) {
        best = d;
        max = c;
      }
    }
    return best;
  }, [rows]);

  const handleFile = async (f: File) => {
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (!json || json.length < 2) throw new Error('Planilha vazia');
      const headers = (json[0] || []).map(h => normalize(String(h || '')));
      const idxNome = headers.findIndex(h => h.includes('COLABORADOR'));
      const idxValor = headers.findIndex(h => h.includes('VALOR'));
      const idxData = (() => {
        const idxA = headers.findIndex(h => h.includes('AUTORIZACAO'));
        if (idxA >= 0) return idxA;
        const idxL = headers.findIndex(h => h.includes('LIBERACAO'));
        if (idxL >= 0) return idxL;
        const idxD = headers.findIndex(h => h.startsWith('DATA'));
        return idxD;
      })();

      if (idxNome < 0 || idxValor < 0) {
        throw new Error(
          'Cabeçalhos esperados não encontrados (Colaborador, Valor)'
        );
      }

      const next: PreviewRow[] = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i] || [];
        const nomeRaw = row[idxNome];
        const valorRaw = row[idxValor];
        if (nomeRaw == null && valorRaw == null) continue;
        const nome = String(nomeRaw || '')
          .toString()
          .trim();
        const valor = parseBRL(valorRaw);
        if (!nome || !Number.isFinite(valor) || valor <= 0) continue;
        const data = idxData >= 0 ? excelDateToISO(row[idxData]) : undefined;
        next.push({ nome, valor, data, enabled: true });
      }
      setRows(next);
      setFileName(f.name);
      // auto preencher total
      setValorTotal(
        new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(
          next.reduce((a, b) => a + b.valor, 0)
        )
      );
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!grupoId) throw new Error('Selecione o grupo');
      if (!categoriaId) throw new Error('Selecione a categoria');
      const totalInformado = parseBRL(valorTotal);
      const selecionadas = rows.filter(r => r.enabled);
      const soma = selecionadas.reduce((a, b) => a + b.valor, 0);
      if (Math.abs(totalInformado - soma) > 0.05) {
        throw new Error(
          `Diferença entre total informado e soma (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(soma)})`
        );
      }
      const payload = {
        grupoId,
        categoriaId,
        valorTotal: totalInformado,
        formaPagamento: formaPag,
        dataPai: mostCommonDate,
        items: selecionadas.map(r => ({
          nome: r.nome,
          valor: r.valor,
          data: r.data,
        })),
      };
      const res = await fetch('/api/folha/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao importar');
      toast.success('Folha importada com sucesso');
      onOpenChange(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Folha Salarial</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Grupo</Label>
              <Select value={grupoId} onValueChange={setGrupoId}>
                <SelectTrigger>
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
            <div>
              <Label>Categoria</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Input
                value={formaPag}
                onChange={e => setFormaPag(e.target.value)}
              />
            </div>
          </div>

          {/* Removed date format selector; parser assumes dd/MM with optional time */}

          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Valor total (NSU)</Label>
              <Input
                placeholder="0,00"
                value={valorTotal}
                onChange={e => setValorTotal(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Arquivo XLS/CSV</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {fileName ? (
                  <span className="text-sm text-muted-foreground">
                    {fileName}
                  </span>
                ) : null}
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  Linhas: {rows.length} • Selecionadas:{' '}
                  {rows.filter(r => r.enabled).length}
                  {mostCommonDate
                    ? ` • Data mais comum: ${mostCommonDate.split('-').reverse().join('/')}`
                    : ''}
                </div>
                <div>
                  Soma selecionada:{' '}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(somaSelecionada)}
                </div>
              </div>
              <div className="max-h-72 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left">Importar</th>
                      <th className="p-2 text-left">Colaborador</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={r.enabled}
                            onChange={e =>
                              setRows(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? { ...x, enabled: e.target.checked }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2">{r.nome}</td>
                        <td className="p-2">
                          {r.data ? r.data.split('-').reverse().join('/') : '-'}
                        </td>
                        <td className="p-2 text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(r.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !rows.length}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar Folha
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
