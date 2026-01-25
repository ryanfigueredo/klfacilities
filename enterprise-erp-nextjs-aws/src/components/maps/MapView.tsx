'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type UnidadeMapData = {
  id: string;
  nome: string;
  grupoNome: string | null;
  responsavelNome: string | null;
  ativa: boolean;
  lat?: number | null;
  lng?: number | null;
};

type MapViewProps = {
  unidades: UnidadeMapData[];
};

// Cores para diferentes grupos
const GRUPO_COLORS = [
  '#3b82f6', // azul
  '#ef4444', // vermelho
  '#10b981', // verde
  '#f59e0b', // laranja
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#06b6d4', // ciano
  '#84cc16', // verde limão
  '#f97316', // laranja escuro
  '#6366f1', // índigo
  '#14b8a6', // teal
  '#a855f7', // violeta
];

// Função para gerar uma cor consistente baseada no nome do grupo
const getColorForGrupo = (grupoNome: string | null): string => {
  if (!grupoNome) return '#9ca3af'; // cinza para não vinculado
  
  // Gerar um hash simples do nome do grupo para obter uma cor consistente
  let hash = 0;
  for (let i = 0; i < grupoNome.length; i++) {
    hash = grupoNome.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRUPO_COLORS.length;
  return GRUPO_COLORS[index];
};

// Fix para ícones do Leaflet no Next.js
const createCustomIcon = (color: string, isActive: boolean) => {
  // Escurecer a cor se a unidade estiver inativa
  const finalColor = isActive ? color : '#9ca3af';
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="${finalColor}" stroke="#fff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.5 12.5 28.5 12.5 28.5S25 21 25 12.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  });
};

export default function MapView({ unidades }: MapViewProps) {
  // Calcular centro do mapa baseado nas coordenadas das unidades
  const center = useMemo(() => {
    if (unidades.length === 0) {
      return [-14.235, -51.925] as [number, number]; // Centro do Brasil
    }
    return [
      unidades.reduce((sum, u) => sum + (u.lat || 0), 0) / unidades.length,
      unidades.reduce((sum, u) => sum + (u.lng || 0), 0) / unidades.length,
    ] as [number, number];
  }, [unidades]);

  // Calcular zoom baseado na distribuição das unidades
  const zoom = useMemo(() => {
    if (unidades.length === 0) return 4;
    if (unidades.length === 1) return 10;
    
    const lats = unidades.map(u => u.lat!).filter(Boolean);
    const lngs = unidades.map(u => u.lng!).filter(Boolean);
    
    if (lats.length === 0 || lngs.length === 0) return 4;
    
    const latDiff = Math.max(...lats) - Math.min(...lats);
    const lngDiff = Math.max(...lngs) - Math.min(...lngs);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    if (maxDiff > 10) return 4;
    if (maxDiff > 5) return 5;
    if (maxDiff > 2) return 6;
    if (maxDiff > 1) return 7;
    if (maxDiff > 0.5) return 8;
    if (maxDiff > 0.2) return 9;
    return 10;
  }, [unidades]);

  // CSS do Leaflet já está importado no globals.css

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {unidades.map(unidade => {
        const color = getColorForGrupo(unidade.grupoNome);
        return (
          <Marker
            key={unidade.id}
            position={[unidade.lat!, unidade.lng!]}
            icon={createCustomIcon(color, unidade.ativa)}
          >
          <Popup>
            <div className="min-w-48">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">{unidade.nome}</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Grupo:</span>{' '}
                  <span
                    className={
                      unidade.grupoNome ? '' : 'text-muted-foreground'
                    }
                  >
                    {unidade.grupoNome || 'Não vinculado'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Responsável:</span>{' '}
                  <span
                    className={
                      unidade.responsavelNome
                        ? ''
                        : 'text-muted-foreground'
                    }
                  >
                    {unidade.responsavelNome || 'Não vinculado'}
                  </span>
                </div>
                <div className="pt-1">
                  <Badge
                    variant={unidade.ativa ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {unidade.ativa ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <div className="pt-1 text-xs text-muted-foreground">
                  Lat: {unidade.lat?.toFixed(4)}, Lng:{' '}
                  {unidade.lng?.toFixed(4)}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
        );
      })}
    </MapContainer>
  );
}

