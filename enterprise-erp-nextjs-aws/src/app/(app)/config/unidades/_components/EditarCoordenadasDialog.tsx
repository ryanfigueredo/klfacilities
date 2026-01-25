'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ExternalLink, Check, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Importar Leaflet dinamicamente (client-side only)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), {
  ssr: false,
});

type UnidadeCoordenadas = {
  id: string;
  nome: string;
  lat?: number | null;
  lng?: number | null;
  radiusM?: number | null;
};

type EditarCoordenadasDialogProps = {
  unidade: UnidadeCoordenadas;
  onSave: (data: {
    lat: number | null;
    lng: number | null;
    radiusM: number | null;
  }) => Promise<void>;
  onClose: () => void;
};

export default function EditarCoordenadasDialog({
  unidade,
  onSave,
  onClose,
}: EditarCoordenadasDialogProps) {
  const [lat, setLat] = useState(unidade.lat?.toString() || '');
  const [lng, setLng] = useState(unidade.lng?.toString() || '');
  const [radiusM, setRadiusM] = useState(
    unidade.radiusM?.toString() || '100'
  );
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Calcular centro do mapa
  const mapCenter: [number, number] =
    lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))
      ? [parseFloat(lat), parseFloat(lng)]
      : [-14.235, -51.925]; // Centro do Brasil como padrão

  // Calcular zoom baseado no raio
  const calculateZoom = (radius: number): number => {
    // Aproximação: raio maior = zoom menor
    if (radius >= 5000) return 10;
    if (radius >= 2000) return 11;
    if (radius >= 1000) return 12;
    if (radius >= 500) return 13;
    if (radius >= 200) return 14;
    if (radius >= 100) return 15;
    if (radius >= 50) return 16;
    return 17;
  };

  const currentZoom = radiusM && !isNaN(parseInt(radiusM))
    ? calculateZoom(parseInt(radiusM))
    : 15;

  const handleSave = async () => {
    try {
      setLoading(true);

      // Normalizar coordenadas: substituir vírgula por ponto (formato brasileiro)
      const latNormalizado = lat ? lat.replace(',', '.') : '';
      const lngNormalizado = lng ? lng.replace(',', '.') : '';

      // Validar se são números válidos
      const latNum = latNormalizado ? parseFloat(latNormalizado) : null;
      const lngNum = lngNormalizado ? parseFloat(lngNormalizado) : null;

      if (lat && (isNaN(latNum!) || latNum! < -90 || latNum! > 90)) {
        toast.error('Latitude deve ser um número entre -90 e 90');
        return;
      }

      if (lng && (isNaN(lngNum!) || lngNum! < -180 || lngNum! > 180)) {
        toast.error('Longitude deve ser um número entre -180 e 180');
        return;
      }

      // Validar e converter radiusM - sempre deve ter um valor
      let radiusMNum: number;
      if (radiusM && radiusM.trim() !== '') {
        const parsed = parseInt(radiusM.trim());
        if (isNaN(parsed) || parsed <= 0) {
          toast.error('Raio deve ser um número positivo (em metros)');
          return;
        }
        radiusMNum = parsed;
      } else {
        // Se não foi informado, usar valor padrão de 100m
        radiusMNum = 100;
      }

      await onSave({
        lat: latNum,
        lng: lngNum,
        radiusM: radiusMNum, // Sempre enviar um número, nunca null
      });
      toast.success('Coordenadas salvas com sucesso');
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar coordenadas');
    } finally {
      setLoading(false);
    }
  };

  const abrirGoogleMaps = () => {
    const latNum = lat ? parseFloat(lat) : null;
    const lngNum = lng ? parseFloat(lng) : null;

    if (!latNum || !lngNum || isNaN(latNum) || isNaN(lngNum)) {
      toast.error('Preencha as coordenadas antes de verificar no Google Maps');
      return;
    }

    // Usar formato de coordenadas para abrir no Google Maps
    window.open(`https://www.google.com/maps?q=${latNum},${lngNum}`, '_blank');
  };

  const hasValidCoords =
    lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
  const radiusNum = radiusM && !isNaN(parseInt(radiusM))
    ? parseInt(radiusM)
    : 100;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Editar Coordenadas e Raio de Alcance
          </CardTitle>
          <p className="text-sm text-muted-foreground">{unidade.nome}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campos de entrada */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                placeholder="Ex: -23.5505"
                value={lat}
                onChange={e => setLat(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Entre -90 e 90
              </p>
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                placeholder="Ex: -46.6333"
                value={lng}
                onChange={e => setLng(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Entre -180 e 180
              </p>
            </div>
            <div>
              <Label htmlFor="radiusM">Raio (metros)</Label>
              <div className="flex gap-2">
                <Input
                  id="radiusM"
                  type="number"
                  step="10"
                  min="10"
                  max="50000"
                  placeholder="Ex: 100"
                  value={radiusM}
                  onChange={e => {
                    const value = e.target.value;
                    // Permitir campo vazio temporariamente durante digitação
                    if (value === '') {
                      setRadiusM('');
                      return;
                    }
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 10) {
                      setRadiusM(value);
                    }
                  }}
                  onBlur={e => {
                    // Se ficou vazio ao sair do campo, restaurar valor padrão
                    if (!e.target.value || e.target.value.trim() === '') {
                      setRadiusM('100');
                    }
                  }}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 w-8 p-0"
                    onClick={() => {
                      const current = parseInt(radiusM) || 100;
                      const newValue = Math.max(10, current - 10);
                      setRadiusM(String(newValue));
                    }}
                    disabled={!radiusM || parseInt(radiusM) <= 10}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 w-8 p-0"
                    onClick={() => {
                      const current = parseInt(radiusM) || 100;
                      const newValue = current + 10;
                      setRadiusM(String(newValue));
                    }}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use os botões +/- ou digite o valor. Raio atual: {radiusM}m
              </p>
            </div>
          </div>

          {/* Mapa Interativo */}
          {hasValidCoords && (
            <div className="space-y-2">
              <Label>Visualização do Raio de Alcance</Label>
              <div className="relative h-96 w-full rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-100">
                <MapContainer
                  key={`map-${mapCenter[0]}-${mapCenter[1]}-${radiusNum}`}
                  center={mapCenter}
                  zoom={currentZoom}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                  scrollWheelZoom={true}
                  whenReady={() => setMapReady(true)}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={mapCenter}>
                    <Popup>
                      <div className="text-center">
                        <strong>{unidade.nome}</strong>
                        <br />
                        <span className="text-xs">
                          Lat: {parseFloat(lat).toFixed(6)}
                          <br />
                          Lng: {parseFloat(lng).toFixed(6)}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={mapCenter}
                    radius={radiusNum}
                    pathOptions={{
                      color: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.2,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong>Raio de Alcance</strong>
                        <br />
                        <span className="text-sm">{radiusNum}m</span>
                      </div>
                    </Popup>
                  </Circle>
                </MapContainer>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Dica: Use o zoom do mapa (scroll do mouse) para visualizar
                melhor o raio. O círculo azul mostra a área permitida para bater
                ponto. Ajuste o raio usando os botões +/- ou digitando o valor.
              </p>
            </div>
          )}

          {!hasValidCoords && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Preencha as coordenadas (Latitude e Longitude) para visualizar o
                mapa e o raio de alcance.
              </p>
            </div>
          )}

          {/* Link para Google Maps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <ExternalLink className="h-4 w-4" />
              <span className="font-medium text-sm">Buscar no Google Maps</span>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              Clique no botão abaixo para abrir o Google Maps e verificar se as
              coordenadas configuradas estão corretas.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={abrirGoogleMaps}
              className="w-full"
              disabled={!lat || !lng}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Verificar coordenadas no Google Maps
            </Button>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Check className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
