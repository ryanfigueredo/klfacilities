'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Filter, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { asCompetencia } from '@/lib/utils/analytics';

interface AnalyticsFiltersProps {
  grupos: { id: string; nome: string }[];
  unidades: { id: string; nome: string }[];
  categorias: { nome: string }[];
}

export function AnalyticsFilters({
  grupos,
  unidades,
  categorias,
}: AnalyticsFiltersProps) {
  const {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    reset,
    hasActiveFilters,
  } = useAnalyticsFilters();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Definir período padrão (mês atual)
  const currentMonth = asCompetencia(new Date());
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const handleDateRangeChange = (
    dates: { from?: Date; to?: Date } | undefined
  ) => {
    if (!dates) return;
    setFilters({
      ...filters,
      start: dates.from?.toISOString(),
      end: dates.to?.toISOString(),
    });
  };

  const handleTipoChange = (value: string) => {
    if (value === 'AMBOS') {
      setFilters({ ...filters, tipo: undefined });
    } else {
      setFilters({ ...filters, tipo: [value as 'RECEITA' | 'DESPESA'] });
    }
  };

  const getTipoValue = () => {
    if (!filters.tipo?.length) return 'AMBOS';
    if (filters.tipo.includes('RECEITA') && filters.tipo.includes('DESPESA'))
      return 'AMBOS';
    if (filters.tipo.includes('RECEITA')) return 'RECEITA';
    if (filters.tipo.includes('DESPESA')) return 'DESPESA';
    return 'AMBOS';
  };

  // Definir o período padrão (mês atual) quando não houver filtros na URL
  useEffect(() => {
    if (!filters.start && !filters.end) {
      const start = new Date(currentMonth).toISOString();
      const end = new Date(nextMonth).toISOString(); // fim exclusivo (primeiro dia do próximo mês)
      setFilters({ ...filters, start, end });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={reset}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Período */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Período</label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.start && filters.end
                  ? `${format(new Date(filters.start), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(filters.end), 'dd/MM/yyyy', { locale: ptBR })}`
                  : 'Selecionar período'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={currentMonth}
                selected={{
                  from: filters.start ? new Date(filters.start) : currentMonth,
                  to: filters.end ? new Date(filters.end) : nextMonth,
                }}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
                locale={ptBR}
                required={false}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Busca */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              value={filters.search || ''}
              onChange={e =>
                setFilters({ ...filters, search: e.target.value || undefined })
              }
              className="pl-10"
            />
          </div>
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo</label>
          <Select value={getTipoValue()} onValueChange={handleTipoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Ambos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AMBOS">Ambos</SelectItem>
              <SelectItem value="RECEITA">Receitas</SelectItem>
              <SelectItem value="DESPESA">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grupos */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Grupos</label>
          <Select onValueChange={value => addFilter('grupoId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Adicionar grupo..." />
            </SelectTrigger>
            <SelectContent>
              {grupos.map(grupo => (
                <SelectItem key={grupo.id} value={grupo.id}>
                  {grupo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.grupoId?.length && (
            <div className="flex flex-wrap gap-1">
              {filters.grupoId.map(id => {
                const grupo = grupos.find(g => g.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer"
                  >
                    {grupo?.nome || id}
                    <X
                      className="h-3 w-3 ml-1"
                      onClick={() => removeFilter('grupoId', id)}
                    />
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Unidades */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Unidades</label>
          <Select onValueChange={value => addFilter('unidadeId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Adicionar unidade..." />
            </SelectTrigger>
            <SelectContent>
              {unidades.map(unidade => (
                <SelectItem key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.unidadeId?.length && (
            <div className="flex flex-wrap gap-1">
              {filters.unidadeId.map(id => {
                const unidade = unidades.find(u => u.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer"
                  >
                    {unidade?.nome || id}
                    <X
                      className="h-3 w-3 ml-1"
                      onClick={() => removeFilter('unidadeId', id)}
                    />
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Categorias */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Categorias</label>
          <Select onValueChange={value => addFilter('categoria', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Adicionar categoria..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map(categoria => (
                <SelectItem key={categoria.nome} value={categoria.nome}>
                  {categoria.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.categoria?.length && (
            <div className="flex flex-wrap gap-1">
              {filters.categoria.map(cat => (
                <Badge key={cat} variant="secondary" className="cursor-pointer">
                  {cat}
                  <X
                    className="h-3 w-3 ml-1"
                    onClick={() => removeFilter('categoria', cat)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
