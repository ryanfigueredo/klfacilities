import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const BRANDING_ID = 'default';

const DEFAULT_BRANDING = {
  primaryColor: '#009ee2',
  secondaryColor: '#e8f5ff',
  accentColor: '#0088c7',
  sidebarBackground: '#f6fbff',
  sidebarTextColor: '#0b2b4f',
} as const;

function formatResponse(record: {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBackground: string;
  sidebarTextColor: string;
  sidebarLogoDataUrl: string | null;
  loginLogoDataUrl: string | null;
  updatedAt: Date;
  updatedById: string | null;
}) {
  return {
    id: record.id,
    primaryColor: record.primaryColor,
    secondaryColor: record.secondaryColor,
    accentColor: record.accentColor,
    sidebarBackground: record.sidebarBackground,
    sidebarTextColor: record.sidebarTextColor,
    sidebarLogoDataUrl: record.sidebarLogoDataUrl,
    loginLogoDataUrl: record.loginLogoDataUrl,
    updatedAt: record.updatedAt,
    updatedById: record.updatedById,
  };
}

function isMissingBrandingTable(error: unknown) {
  return (
    error instanceof PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    (error.meta?.modelName === 'BrandingSettings' ||
      String(error.message || '').includes('BrandingSettings'))
  );
}

async function getOrCreateBranding() {
  try {
    const existing = await prisma.brandingSettings.findUnique({
      where: { id: BRANDING_ID },
    });

    if (existing) {
      return existing;
    }

    return await prisma.brandingSettings.create({
      data: {
        id: BRANDING_ID,
        ...DEFAULT_BRANDING,
      },
    });
  } catch (error) {
    if (isMissingBrandingTable(error)) {
      return {
        id: BRANDING_ID,
        ...DEFAULT_BRANDING,
        sidebarLogoDataUrl: null,
        loginLogoDataUrl: null,
        updatedAt: new Date(),
        updatedById: null,
      };
    }
    throw error;
  }
}

function parseColor(input: FormDataEntryValue | null, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  if (!hexRegex.test(trimmed)) {
    return fallback;
  }
  return trimmed.toLowerCase();
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString('base64');
  return `data:${file.type};base64,${base64}`;
}

export async function GET() {
  try {
    const branding = await getOrCreateBranding();
    return NextResponse.json(formatResponse(branding));
  } catch (error) {
    if (isMissingBrandingTable(error)) {
      return NextResponse.json({
        id: BRANDING_ID,
        ...DEFAULT_BRANDING,
        sidebarLogoDataUrl: null,
        loginLogoDataUrl: null,
        updatedAt: new Date(),
        updatedById: null,
        warning:
          'Tabela de branding ausente. Execute `pnpm prisma migrate deploy` para habilitar personalizações.',
      });
    }
    console.error('Erro ao obter branding', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar as configurações de branding' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role;

    if (!session?.user?.id || !userRole) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!['MASTER', 'ADMIN'].includes(userRole as string)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const formData = await request.formData();

    const primaryColor = parseColor(
      formData.get('primaryColor'),
      DEFAULT_BRANDING.primaryColor
    );
    const secondaryColor = parseColor(
      formData.get('secondaryColor'),
      DEFAULT_BRANDING.secondaryColor
    );
    const accentColor = parseColor(
      formData.get('accentColor'),
      DEFAULT_BRANDING.accentColor
    );
    const sidebarBackground = parseColor(
      formData.get('sidebarBackground'),
      DEFAULT_BRANDING.sidebarBackground
    );
    const sidebarTextColor = parseColor(
      formData.get('sidebarTextColor'),
      DEFAULT_BRANDING.sidebarTextColor
    );

    const updateData: Record<string, unknown> = {
      primaryColor,
      secondaryColor,
      accentColor,
      sidebarBackground,
      sidebarTextColor,
      updatedById: session.user.id,
    };

    const sidebarLogoRemove = formData.get('sidebarLogoRemove') === 'true';
    const loginLogoRemove = formData.get('loginLogoRemove') === 'true';

    const sidebarLogo = formData.get('sidebarLogo');
    const loginLogo = formData.get('loginLogo');

    if (sidebarLogoRemove) {
      updateData.sidebarLogoDataUrl = null;
    } else if (sidebarLogo instanceof File && sidebarLogo.size > 0) {
      if (!sidebarLogo.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Logo do sidebar deve ser uma imagem' },
          { status: 400 }
        );
      }

      if (sidebarLogo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Logo do sidebar deve ter no máximo 5MB' },
          { status: 400 }
        );
      }

      updateData.sidebarLogoDataUrl = await fileToDataUrl(sidebarLogo);
    }

    if (loginLogoRemove) {
      updateData.loginLogoDataUrl = null;
    } else if (loginLogo instanceof File && loginLogo.size > 0) {
      if (!loginLogo.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Logo da tela de login deve ser uma imagem' },
          { status: 400 }
        );
      }

      if (loginLogo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Logo da tela de login deve ter no máximo 5MB' },
          { status: 400 }
        );
      }

      updateData.loginLogoDataUrl = await fileToDataUrl(loginLogo);
    }

    const branding = await prisma.brandingSettings.upsert({
      where: { id: BRANDING_ID },
      create: {
        id: BRANDING_ID,
        ...DEFAULT_BRANDING,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json(formatResponse(branding));
  } catch (error) {
    if (isMissingBrandingTable(error)) {
      return NextResponse.json(
        {
          error:
            'Tabela de branding ausente. Execute `pnpm prisma migrate deploy` e tente novamente.',
        },
        { status: 500 }
      );
    }
    console.error('Erro ao atualizar branding', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar as configurações de branding' },
      { status: 500 }
    );
  }
}

