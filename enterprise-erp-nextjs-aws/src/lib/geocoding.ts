/**
 * Reverse geocoding usando Nominatim (OpenStreetMap)
 * Gratuito e não requer API key
 */

export interface GeocodingResult {
  endereco: string | null;
  erro?: string;
}

/**
 * Obtém o endereço a partir de coordenadas lat/lng
 * Usa Nominatim (OpenStreetMap) que é gratuito
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult> {
  try {
    // Nominatim tem rate limiting, então vamos fazer uma requisição com delay
    // e usar User-Agent conforme recomendado
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KL-ERP/1.0 (https://kl.erp)', // Nominatim requer User-Agent
      },
    });

    if (!response.ok) {
      return {
        endereco: null,
        erro: `Erro ao buscar endereço: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        endereco: null,
        erro: data.error,
      };
    }

    // Formatar o endereço de forma legível
    const address = data.address || {};
    const parts: string[] = [];

    // Construir endereço de forma hierárquica
    if (address.road) parts.push(address.road);
    if (address.house_number) parts[0] = `${address.house_number}, ${parts[0] || address.road}`;
    if (address.neighbourhood || address.suburb) {
      parts.push(address.neighbourhood || address.suburb);
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state) parts.push(address.state);
    if (address.postcode) parts.push(`CEP: ${address.postcode}`);

    const endereco = parts.length > 0 ? parts.join(', ') : data.display_name || null;

    return {
      endereco,
    };
  } catch (error) {
    console.error('Erro ao fazer reverse geocoding:', error);
    return {
      endereco: null,
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

