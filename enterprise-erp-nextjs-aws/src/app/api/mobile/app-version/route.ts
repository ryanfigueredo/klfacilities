import { NextRequest, NextResponse } from 'next/server';

/**
 * OPTIONS /api/mobile/app-version
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 horas
    },
  });
}

/**
 * GET /api/mobile/app-version
 * Verificar se há atualização disponível para o app mobile
 * 
 * Query params:
 * - platform: 'ios' ou 'android'
 * - app: 'colaborador' ou 'admin'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform'); // 'ios' ou 'android'
    const app = searchParams.get('app'); // 'colaborador' ou 'admin'

    if (!platform || !app) {
      return NextResponse.json(
        { hasUpdate: false, error: 'platform e app são obrigatórios' },
        { status: 400 }
      );
    }

    // Versões mais recentes disponíveis
    // ATUALIZE ESTAS VERSÕES quando publicar uma nova versão do app
    const latestVersions: Record<string, Record<string, {
      version: string;
      buildNumber: string;
      required: boolean;
      message?: string;
    }>> = {
      colaborador: {
        ios: {
          version: '1.0.0',
          buildNumber: '1',
          required: false,
          message: 'Nova versão disponível com melhorias de performance e correções de bugs',
        },
        android: {
          version: '1.0.0',
          buildNumber: '1',
          required: false,
          message: 'Nova versão disponível com melhorias de performance e correções de bugs',
        },
      },
      admin: {
        ios: {
          version: '1.0.0',
          buildNumber: '1',
          required: false,
          message: 'Nova versão disponível com melhorias de performance e correções de bugs',
        },
        android: {
          version: '1.0.0',
          buildNumber: '1',
          required: false,
          message: 'Nova versão disponível com melhorias de performance e correções de bugs',
        },
      },
    };

    const appVersions = latestVersions[app];
    if (!appVersions) {
      return NextResponse.json(
        { hasUpdate: false, error: 'App não encontrado' },
        { status: 400 }
      );
    }

    const platformVersions = appVersions[platform];
    if (!platformVersions) {
      return NextResponse.json(
        { hasUpdate: false, error: 'Plataforma não encontrada' },
        { status: 400 }
      );
    }

    // Retornar informações da versão mais recente
    return NextResponse.json({
      hasUpdate: true,
      latestVersion: platformVersions.version,
      latestBuildNumber: platformVersions.buildNumber,
      required: platformVersions.required,
      message: platformVersions.message,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('[app-version] Erro ao verificar versão:', error);
    return NextResponse.json(
      { hasUpdate: false, error: 'Erro ao verificar versão' },
      { status: 500 }
    );
  }
}
