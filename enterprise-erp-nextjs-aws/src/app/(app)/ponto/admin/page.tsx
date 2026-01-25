'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Clock,
  FileText,
  BarChart3,
  Shield,
  FileCheck,
  ExternalLink,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Stats = {
  totalColaboradores: number;
  totalRegistrosHoje: number;
  totalRegistrosMes: number;
  funcionariosAtivosMes: number;
};

type RegistroRecente = {
  id: string;
  timestamp: string;
  tipo: string;
  funcionarioNome: string;
  unidadeNome: string;
};

export default function PontoAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [registrosRecentes, setRegistrosRecentes] = useState<RegistroRecente[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ponto/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRegistrosRecentes(data.registrosRecentes || []);
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ponto Digital - Administração
        </h1>
        <p className="text-gray-600">
          Gerencie colaboradores, registros e configurações do sistema de ponto
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Colaboradores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalColaboradores}
              </div>
              <p className="text-xs text-muted-foreground">
                Colaboradores cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Registros Hoje
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalRegistrosHoje}
              </div>
              <p className="text-xs text-muted-foreground">
                Batidas registradas hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Registros do Mês
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalRegistrosMes}
              </div>
              <p className="text-xs text-muted-foreground">
                Total de batidas no mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Funcionários Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.funcionariosAtivosMes}
              </div>
              <p className="text-xs text-muted-foreground">
                Com registros no mês
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Registros Recentes */}
      {registrosRecentes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimos Registros de Ponto</CardTitle>
            <CardDescription>
              Últimas 10 batidas registradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosRecentes.map(registro => (
                    <TableRow key={registro.id}>
                      <TableCell>{formatDate(registro.timestamp)}</TableCell>
                      <TableCell>{registro.funcionarioNome}</TableCell>
                      <TableCell>{registro.unidadeNome}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            registro.tipo === 'ENTRADA'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {registro.tipo}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4">
              <Link href="/ponto/admin/registros">
                <Button variant="outline" className="w-full">
                  Ver Todos os Registros
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Colaboradores
            </CardTitle>
            <CardDescription>
              Cadastre e vincule colaboradores às unidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rh/colaboradores">
              <Button className="w-full">Gerenciar Colaboradores</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registros de Ponto
            </CardTitle>
            <CardDescription>
              Visualize todos os registros de ponto (batidas) dos colaboradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ponto/admin/registros">
              <Button variant="outline" className="w-full">
                Ver Registros
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Folhas de Ponto
            </CardTitle>
            <CardDescription>
              Visualize folhas de ponto detalhadas por colaborador e unidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ponto/supervisor">
              <Button className="w-full">Ver Folhas de Ponto</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatórios e Análises
            </CardTitle>
            <CardDescription>
              Relatórios consolidados, estatísticas e análises de ponto por
              unidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Em desenvolvimento
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Termos de Ciência
            </CardTitle>
            <CardDescription>
              Gerencie assinaturas de ciência dos funcionários sobre o uso do
              sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ponto/termos-ciencia">
              <Button className="w-full">Gerenciar Termos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Compliance e Documentação Jurídica */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Documentação e Compliance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Política de Privacidade
              </CardTitle>
              <CardDescription>
                Política de privacidade do sistema de ponto eletrônico (LGPD e
                Portaria 671/2021)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/compliance/privacidade"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full">
                  Ver Política
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Relatório de Conformidade
              </CardTitle>
              <CardDescription>
                Relatório técnico completo de conformidade LGPD e REP-P
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/compliance/conformidade"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full">
                  Ver Relatório
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
