'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateRangePicker, Range } from '@/components/DateRangePicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { label: string; value: string };

type Props = {
  groups?: Option[];
  units: Option[];
  categories: Option[];
  initial: {
    q?: string;
    range?: Range;
    groupIds?: string[];
    unidadeIds?: string[];
    categoriaIds?: string[];
  };
  className?: string;
  onApply?: (params: URLSearchParams) => void;
};

export function FilterBar({
  groups = [],
  units,
  categories,
  initial,
  className,
  onApply,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [q, setQ] = React.useState(initial.q ?? '');
  const [range, setRange] = React.useState<Range>(
    initial.range ?? ({} as Range)
  );
  const [grupos, setGrupos] = React.useState<string[]>(initial.groupIds ?? []);
  const [unidades, setUnidades] = React.useState<string[]>(
    initial.unidadeIds ?? []
  );
  const [cats, setCats] = React.useState<string[]>(initial.categoriaIds ?? []);

  // Local search inputs for popovers
  const [gSearch, setGSearch] = React.useState('');
  const [uSearch, setUSearch] = React.useState('');
  const [cSearch, setCSearch] = React.useState('');

  // Presets (saved filter sets)
  type Preset = {
    name: string;
    q?: string;
    from?: string;
    to?: string;
    grupos?: string[];
    unidades?: string[];
    categorias?: string[];
  };

  const currentPresetState = (): Preset => ({
    name: new Date().toLocaleString(),
    q,
    from: range?.from ? range.from.toISOString().slice(0, 10) : undefined,
    to: range?.to ? range.to.toISOString().slice(0, 10) : undefined,
    grupos,
    unidades,
    categorias: cats,
  });

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    q ? params.set('q', q) : params.delete('q');
    if (range?.from) params.set('from', range.from!.toISOString().slice(0, 10));
    else params.delete('from');
    if (range?.to) params.set('to', range.to!.toISOString().slice(0, 10));
    else params.delete('to');
    // grupos -> repetir grupoId
    params.delete('grupoId');
    for (const g of grupos) params.append('grupoId', g);
    params.delete('unidades');
    params.delete('categorias');
    if (unidades.length) params.set('unidades', unidades.join(','));
    if (cats.length) params.set('categorias', cats.join(','));
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
    onApply?.(params);
  };

  const clearAll = () => {
    setQ('');
    setRange({} as Range);
    setGrupos([]);
    setUnidades([]);
    setCats([]);
    router.replace(pathname);
    router.refresh();
    onApply?.(new URLSearchParams());
  };

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border p-3',
        className
      )}
    >
      <div className="md:col-span-3">
        <Input
          placeholder="Buscar..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="md:col-span-3">
        <div className="w-full">
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      <div className="md:col-span-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>Grupos{grupos.length ? ` (${grupos.length})` : ''}</span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-2">
            <div className="space-y-2">
              <Input
                placeholder="Buscar grupo..."
                value={gSearch}
                onChange={e => setGSearch(e.target.value)}
                className="h-8"
              />
              <div className="max-h-60 overflow-auto rounded border">
                {(groups || [])
                  .filter(g =>
                    (g.label || '')
                      .toLowerCase()
                      .includes(gSearch.toLowerCase())
                  )
                  .map(g => {
                    const checked = grupos.includes(g.value);
                    return (
                      <button
                        key={g.value}
                        onClick={() =>
                          setGrupos(prev =>
                            checked
                              ? prev.filter(v => v !== g.value)
                              : [...prev, g.value]
                          )
                        }
                        className={cn(
                          'flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-muted',
                          checked && 'bg-muted'
                        )}
                      >
                        <span>{g.label}</span>
                        {checked && (
                          <Badge variant="secondary">selecionado</Badge>
                        )}
                      </button>
                    );
                  })}
              </div>
              {grupos.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setGrupos([])}>
                  <X className="mr-1 h-4 w-4" /> limpar
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:col-span-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>
                Unidades{unidades.length ? ` (${unidades.length})` : ''}
              </span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-2">
            <div className="space-y-2">
              <Input
                placeholder="Buscar unidade..."
                value={uSearch}
                onChange={e => setUSearch(e.target.value)}
                className="h-8"
              />
              <div className="max-h-60 overflow-auto rounded border">
                {(units || [])
                  .filter(u =>
                    (u.label || '')
                      .toLowerCase()
                      .includes(uSearch.toLowerCase())
                  )
                  .map(u => {
                    const checked = unidades.includes(u.value);
                    return (
                      <button
                        key={u.value}
                        onClick={() =>
                          setUnidades(prev =>
                            checked
                              ? prev.filter(v => v !== u.value)
                              : [...prev, u.value]
                          )
                        }
                        className={cn(
                          'flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-muted',
                          checked && 'bg-muted'
                        )}
                      >
                        <span>{u.label}</span>
                        {checked && (
                          <Badge variant="secondary">selecionado</Badge>
                        )}
                      </button>
                    );
                  })}
              </div>
              {unidades.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUnidades([])}
                >
                  <X className="mr-1 h-4 w-4" /> limpar
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:col-span-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>Categorias{cats.length ? ` (${cats.length})` : ''}</span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-2">
            <div className="space-y-2">
              <Input
                placeholder="Buscar categoria..."
                value={cSearch}
                onChange={e => setCSearch(e.target.value)}
                className="h-8"
              />
              <div className="max-h-60 overflow-auto rounded border">
                {(categories || [])
                  .filter(c =>
                    (c.label || '')
                      .toLowerCase()
                      .includes(cSearch.toLowerCase())
                  )
                  .map(c => {
                    const checked = cats.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        onClick={() =>
                          setCats(prev =>
                            checked
                              ? prev.filter(v => v !== c.value)
                              : [...prev, c.value]
                          )
                        }
                        className={cn(
                          'flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-muted',
                          checked && 'bg-muted'
                        )}
                      >
                        <span>{c.label}</span>
                        {checked && (
                          <Badge variant="secondary">selecionado</Badge>
                        )}
                      </button>
                    );
                  })}
              </div>
              {cats.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCats([])}>
                  <X className="mr-1 h-4 w-4" /> limpar
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:col-span-2 flex gap-2">
        <Button variant="secondary" onClick={clearAll}>
          Limpar
        </Button>
        <Button onClick={apply}>Aplicar</Button>
      </div>

      <div className="flex  items-center justify-end gap-2 pt-1"></div>
    </div>
  );
}
