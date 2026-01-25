/**
 * Validação de Geofence
 * Verifica se o funcionário está dentro do raio permitido da unidade
 */

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface Unidade {
  lat: number | null;
  lng: number | null;
  radiusM: number | null; // Raio em metros
}

/**
 * Calcular distância entre duas coordenadas (Haversine formula)
 * Retorna distância em metros
 */
function calcularDistancia(
  coord1: Coordenada,
  coord2: Coordenada
): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
  const dLng = (coord2.lng - coord1.lng) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * (Math.PI / 180)) *
      Math.cos(coord2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c;
  
  return distancia;
}

/**
 * Validar se está dentro do geofence
 */
export function validarGeofence(
  localizacaoAtual: Coordenada,
  unidade: Unidade
): { valido: boolean; distancia?: number; mensagem?: string } {
  // Converter para números se vierem como string
  const lat = typeof unidade.lat === 'string' ? parseFloat(unidade.lat) : unidade.lat;
  const lng = typeof unidade.lng === 'string' ? parseFloat(unidade.lng) : unidade.lng;
  const radiusM = typeof unidade.radiusM === 'string' ? parseFloat(unidade.radiusM) : unidade.radiusM;

  // Se a unidade não tem coordenadas configuradas, permite
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return {
      valido: true,
      mensagem: 'Unidade sem geofence configurado',
    };
  }

  // Se não tem raio configurado, permite (só valida se tem raio)
  if (!radiusM || isNaN(radiusM)) {
    return {
      valido: true,
      mensagem: 'Unidade sem raio de geofence configurado',
    };
  }

  const coordenadaUnidade: Coordenada = {
    lat: lat,
    lng: lng,
  };

  const distancia = calcularDistancia(localizacaoAtual, coordenadaUnidade);

  // Adicionar margem de tolerância para erro do GPS (20% do raio ou mínimo de 30m)
  // Isso ajuda a compensar imprecisões do GPS, especialmente em ambientes internos
  const margemTolerancia = Math.max(radiusM * 0.2, 30);
  const raioComTolerancia = radiusM + margemTolerancia;

  if (distancia > raioComTolerancia) {
    return {
      valido: false,
      distancia: Math.round(distancia),
      mensagem: `Você está a ${Math.round(distancia)}m da unidade. É necessário estar dentro do raio de ${radiusM}m para registrar o ponto.`,
    };
  }

  return {
    valido: true,
    distancia: Math.round(distancia),
    mensagem: `Localização válida (${Math.round(distancia)}m da unidade)`,
  };
}

