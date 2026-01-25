import { NextRequest, NextResponse } from 'next/server';

import { reverseGeocode } from '@/lib/geocoding';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Parâmetros lat e lng são obrigatórios' },
      { status: 400 }
    );
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return NextResponse.json(
      { error: 'Lat e lng devem ser números válidos' },
      { status: 400 }
    );
  }

  try {
    const result = await reverseGeocode(latNum, lngNum);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao fazer reverse geocoding:', error);
    return NextResponse.json(
      {
        endereco: null,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

