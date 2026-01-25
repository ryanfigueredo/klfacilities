'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin } from 'lucide-react';

type UnidadeMapData = {
  id: string;
  nome: string;
  grupoNome: string | null;
  responsavelNome: string | null;
  ativa: boolean;
  lat?: number | null;
  lng?: number | null;
};

type UnidadesMapProps = {
  unidades: UnidadeMapData[];
  className?: string;
};


// Componente do mapa carregado dinamicamente
const MapView = dynamic(
  () => import('./MapView'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando mapa...</p>
      </div>
    ),
  }
);

export default function UnidadesMap({ unidades, className }: UnidadesMapProps) {

  // Filtrar unidades que têm coordenadas
  const unidadesComCoordenadas = unidades.filter(
    u => u.lat && u.lng && !isNaN(u.lat) && !isNaN(u.lng)
  );

  const unidadesSemCoordenadas = unidades.filter(
    u => !u.lat || !u.lng || isNaN(u.lat) || isNaN(u.lng)
  );

  // Se não há coordenadas, mostrar aviso
  if (unidadesComCoordenadas.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa das Unidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">
                  Coordenadas não configuradas
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                Nenhuma unidade possui coordenadas (latitude/longitude)
                configuradas. Para visualizar no mapa, é necessário adicionar as
                coordenadas de cada unidade.
              </p>
            </div>

            {unidadesSemCoordenadas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Unidades sem coordenadas ({unidadesSemCoordenadas.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {unidadesSemCoordenadas.slice(0, 10).map(unidade => (
                    <div
                      key={unidade.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{unidade.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        {unidade.grupoNome || 'Não vinculado'}
                      </Badge>
                    </div>
                  ))}
                  {unidadesSemCoordenadas.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ... e mais {unidadesSemCoordenadas.length - 10} unidades
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa das Unidades
        </CardTitle>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>
            {unidadesComCoordenadas.length} de {unidades.length} unidades com
            localização
          </span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>Unidades inativas</span>
          </div>
          <div className="text-xs">
            <span className="font-medium">Cores por grupo:</span> Cada grupo possui uma cor única no mapa
          </div>
        </div>
        {unidadesSemCoordenadas.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <p className="text-xs text-yellow-700">
              {unidadesSemCoordenadas.length} unidades ainda precisam de
              coordenadas para aparecer no mapa
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full rounded-lg overflow-hidden border">
          <MapView unidades={unidadesComCoordenadas} />
        </div>
      </CardContent>
    </Card>
  );
}
