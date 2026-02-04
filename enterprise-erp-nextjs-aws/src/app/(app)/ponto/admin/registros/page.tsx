'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';

type RegistroPonto = {
  id: string;
  timestamp: string;
  tipo: string;
  funcionario: {
    id: string;
    nome: string;
  } | null;
  unidade: {
    id: string;
    nome: string;
  } | null;
};

type Unidade = {
  id: string;
  nome: string;
};

type Funcionario = {
  id: string;
  nome: string;
  cpf: string | null;
};

export default function RegistrosPontoPage() {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Filtros
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [unidadeId, setUnidadeId] = useState<string>('');
  const [funcionarioId, setFuncionarioId] = useState<string>('');

  const loadUnidades = useCallback(async () => {
    try {
      const res = await fetch('/api/unidades');
      if (res.ok) {
        const data = await res.json();
        setUnidades(data.filter((u: Unidade) => u.id));
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  }, []);

  const loadFuncionarios = useCallback(async () => {
    try {
      const res = await fetch('/api/funcionarios');
      if (res.ok) {
        const data = await res.json();
        setFuncionarios(data.rows || []);
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  }, []);

  const loadRegistros = useCallback(async () => {
    if (!month) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', month);
      if (unidadeId) params.set('unidadeId', unidadeId);
      if (funcionarioId) params.set('funcionarioId', funcionarioId);

      const res = await fetch(`/api/ponto/registros?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setRegistros(data.data);
        } else if (Array.isArray(data)) {
          setRegistros(data);
        } else {
          console.error('Formato de dados inválido:', data);
          setRegistros([]);
        }
      } else {
        try {
          const error = await res.json();
          console.error('Erro ao carregar registros:', error);
        } catch {
          console.error('Erro ao carregar registros:', res.statusText);
        }
        setRegistros([]);
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, [month, unidadeId, funcionarioId]);

  useEffect(() => {
    setMounted(true);
    loadUnidades();
    loadFuncionarios();
  }, [loadUnidades, loadFuncionarios]);

  useEffect(() => {
    if (mounted && month) {
      loadRegistros();
    }
  }, [mounted, month, unidadeId, funcionarioId, loadRegistros]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  };

  // Filtrar funcionários por unidade selecionada
  const funcionariosFiltrados = unidadeId
    ? funcionarios.filter(f => {
        // Precisamos verificar se o funcionário tem a unidade selecionada
        // Como não temos essa info direta, vamos mostrar todos por enquanto
        // e filtrar no backend
        return true;
      })
    : funcionarios;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ponto/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Registros de Ponto
          </h1>
          <p className="text-gray-600">
            Visualize todos os registros de ponto dos colaboradores
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <input
                id="month"
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger id="unidade">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as unidades</SelectItem>
                  {unidades.map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcionario">Funcionário</Label>
              <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                <SelectTrigger id="funcionario">
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os funcionários</SelectItem>
                  {funcionariosFiltrados.map(funcionario => (
                    <SelectItem key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={loadRegistros} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              onClick={() => {
                setUnidadeId('');
                setFuncionarioId('');
                const now = new Date();
                setMonth(
                  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                );
              }}
              variant="ghost"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>
            {loading
              ? 'Carregando...'
              : `${registros.length} registro(s) encontrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map(registro => (
                    <TableRow key={registro.id}>
                      <TableCell>
                        {formatDateOnly(registro.timestamp)}
                      </TableCell>
                      <TableCell>{formatTime(registro.timestamp)}</TableCell>
                      <TableCell>
                        {registro.funcionario?.nome || 'N/A'}
                      </TableCell>
                      <TableCell>{registro.unidade?.nome || 'N/A'}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            registro.tipo === 'ENTRADA'
                              ? 'bg-green-100 text-green-800'
                              : registro.tipo === 'SAIDA'
                                ? 'bg-blue-100 text-blue-800'
                                : registro.tipo === 'INTERVALO_INICIO'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : registro.tipo === 'INTERVALO_FIM'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {registro.tipo === 'ENTRADA'
                            ? 'ENTRADA'
                            : registro.tipo === 'SAIDA'
                              ? 'SAÍDA'
                              : registro.tipo === 'INTERVALO_INICIO'
                                ? 'INÍCIO INTERVALO'
                                : registro.tipo === 'INTERVALO_FIM'
                                  ? 'FIM INTERVALO'
                                  : registro.tipo}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
