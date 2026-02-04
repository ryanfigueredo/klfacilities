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
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Stats = {
  totalColaboradores: number;
  totalRegistrosHoje: number;
  totalRegistrosMes: number;
  funcionariosAtivosMes: number;
};

export default function PontoAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ponto/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      }
    })();
  }, []);

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

      {/* Estatísticas Resumidas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Colaboradores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalColaboradores}
              </div>
              <p className="text-xs text-muted-foreground">Total cadastrados</p>
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
              <p className="text-xs text-muted-foreground">Batidas de hoje</p>
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
              <p className="text-xs text-muted-foreground">Total do mês</p>
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

      {/* Ações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Colaboradores
            </CardTitle>
            <CardDescription>Gerenciar colaboradores</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rh/colaboradores">
              <Button className="w-full" size="sm">
                Acessar
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Registros de Ponto
            </CardTitle>
            <CardDescription>Ver todos os registros</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ponto/admin/registros">
              <Button className="w-full" size="sm">
                Acessar
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Folhas de Ponto
            </CardTitle>
            <CardDescription>Visualizar folhas detalhadas</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ponto/supervisor">
              <Button className="w-full" size="sm">
                Acessar
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5" />
              Termos de Ciência
            </CardTitle>
            <CardDescription>Gerenciar assinaturas</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ponto/admin/termos-ciencia">
              <Button className="w-full" size="sm">
                Acessar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
