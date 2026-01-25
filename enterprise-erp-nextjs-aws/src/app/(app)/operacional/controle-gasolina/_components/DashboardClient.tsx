'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type KmRecord = {
  id: string;
  km: number;
  photoUrl: string | null;
  observacao: string | null;
  createdAt: string;
};

type FuelRecord = {
  id: string;
  litros: number;
  valor: number;
  situacaoTanque: string;
  kmAtual: number;
  photoUrl: string | null;
  observacao: string | null;
  createdAt: string;
};

type VehicleSummary = {
  id: string;
  placa: string;
  modelo: string | null;
};

type UserResumo = {
  totalGasto: number;
  abastecimentos: number;
  totalKm: number;
  mediaPorLitro: number;
  veiculo?: {
    id: string;
    placa: string;
    modelo: string | null;
  };
};

interface DashboardClientProps {
  initialVehicle: VehicleSummary | null;
  canRegisterRoute: boolean;
  canViewAdmin: boolean;
}

export function DashboardClient({
  initialVehicle,
  canRegisterRoute,
  canViewAdmin,
}: DashboardClientProps) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleSummary | null>(initialVehicle);
  const [kmRecords, setKmRecords] = useState<KmRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [resumo, setResumo] = useState<UserResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [histRes, resumoRes, vehicleRes] = await Promise.all([
          fetch('/api/controle-gasolina/historico', { cache: 'no-store' }),
          fetch('/api/controle-gasolina/usuario/resumo', { cache: 'no-store' }),
          fetch('/api/controle-gasolina/usuario/veiculo', {
            cache: 'no-store',
          }),
        ]);

        if (histRes.ok) {
          const histData = await histRes.json();
          setKmRecords(histData.kmRecords ?? []);
          setFuelRecords(histData.fuelRecords ?? []);
        } else {
          setKmRecords([]);
          setFuelRecords([]);
        }

        if (resumoRes.ok) {
          const resumoData = await resumoRes.json();
          setResumo(resumoData.resumo ?? null);
        }

        if (vehicleRes.ok) {
          const vehicleData = await vehicleRes.json();
          setVehicle(
            vehicleData
              ? {
                  id: vehicleData.id,
                  placa: vehicleData.placa,
                  modelo: vehicleData.modelo,
                }
              : null
          );
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        toast.error(
          'Não foi possível carregar os dados do controle de gasolina.'
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const resumoCards = useMemo(() => {
    if (!resumo) return null;
    return [
      {
        label: 'Total Gasto (Ticket Log)',
        value: resumo.totalGasto.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
      },
      {
        label: 'Abastecimentos',
        value: resumo.abastecimentos.toString(),
      },
      {
        label: 'KM Registrados',
        value: resumo.totalKm.toLocaleString('pt-BR'),
      },
      {
        label: 'Média (km/l)',
        value: resumo.mediaPorLitro ? resumo.mediaPorLitro.toFixed(2) : '—',
      },
    ];
  }, [resumo]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Controle de Gasolina
        </h1>
        <p className="text-sm text-muted-foreground">
          Registre rotas com foto do odômetro e acompanhe seus abastecimentos.
        </p>
      </div>

      {vehicle ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Veículo designado
            </CardTitle>
            <Badge variant="secondary">Ativo</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicle.placa}</div>
            {vehicle.modelo && (
              <p className="text-sm text-muted-foreground">{vehicle.modelo}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Nenhum veículo vinculado. Solicite ao administrador um
              cadastramento para registrar rotas.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {canRegisterRoute && (
          <Button
            onClick={() =>
              router.push('/operacional/controle-gasolina/rotas/nova')
            }
          >
            Registrar rota
          </Button>
        )}
        {canViewAdmin && (
          <Button
            variant="outline"
            onClick={() =>
              router.push('/operacional/controle-gasolina/admin')
            }
          >
            Acessar painel administrativo
          </Button>
        )}
      </div>

      {resumoCards && (
        <div className="grid gap-4 md:grid-cols-4">
          {resumoCards.map(card => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimas quilometragens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Carregando registros...
              </p>
            ) : kmRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum registro de quilometragem encontrado.
              </p>
            ) : (
              kmRecords.map(record => (
                <div
                  key={record.id}
                  className="flex gap-3 rounded-lg border bg-card p-3"
                >
                  {record.photoUrl ? (
                    <div className="relative h-16 w-20 overflow-hidden rounded-md">
                      <Image
                        src={record.photoUrl}
                        alt="Foto do odômetro"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-20 items-center justify-center rounded-md border text-xs text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                  <div className="flex flex-1 flex-col text-sm">
                    <span className="font-semibold text-foreground">
                      {record.km.toLocaleString('pt-BR')} km
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString('pt-BR')}
                    </span>
                    {record.observacao && (
                      <span className="text-xs text-muted-foreground">
                        {record.observacao}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos abastecimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Carregando registros...
              </p>
            ) : fuelRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum abastecimento encontrado.
              </p>
            ) : (
              fuelRecords.map(record => (
                <div
                  key={record.id}
                  className="flex gap-3 rounded-lg border bg-card p-3"
                >
                  {record.photoUrl ? (
                    <div className="relative h-16 w-20 overflow-hidden rounded-md">
                      <Image
                        src={record.photoUrl}
                        alt="Comprovante de abastecimento"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-20 items-center justify-center rounded-md border text-xs text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                  <div className="flex flex-1 flex-col text-sm">
                    <span className="font-semibold text-foreground">
                      {record.litros.toLocaleString('pt-BR')} L ·{' '}
                      {record.valor.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      KM indicado: {record.kmAtual.toLocaleString('pt-BR')}
                    </span>
                    {record.observacao && (
                      <span className="text-xs text-muted-foreground">
                        {record.observacao}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
