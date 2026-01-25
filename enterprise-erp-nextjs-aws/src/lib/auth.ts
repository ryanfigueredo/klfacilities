import { cookies } from 'next/headers';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import { NextRequest } from 'next/server';

// Ajuste se usar outro enum
export type Role =
  | 'MASTER'
  | 'ADMIN'
  | 'RH'
  | 'SUPERVISOR'
  | 'JURIDICO'
  | 'OPERACIONAL'
  | 'AUXILIAR_ADMIN'
  | 'FINANCEIRO'
  | 'GESTOR'
  | 'USER'
  | string;
export const roleLabel = (r?: string) =>
  (
    ({
      MASTER: 'Master',
      ADMIN: 'Admin',
      RH: 'RH',
      SUPERVISOR: 'Supervisor',
      JURIDICO: 'Jurídico',
      OPERACIONAL: 'Operacional',
      FINANCEIRO: 'Financeiro',
      GESTOR: 'Gestor',
      USER: 'Usuário',
    }) as any
  )[r ?? ''] ??
  r ??
  '';

export async function getCurrentUser(request?: NextRequest): Promise<
  (User & { role?: string }) | null
> {
  // 0) Verificar JWT token no header Authorization (para mobile app)
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove "Bearer "
      const payload = verifyJWT(token);
      if (payload && payload.userId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
          });
          if (user) return user as any;
        } catch (error) {
          console.error('Erro ao buscar usuário por JWT:', error);
        }
      }
    }
  }

  // 1) NextAuth (se existir)
  try {
    const { getServerSession } = await import('next-auth');
    // Ajuste o caminho de import de acordo com o projeto (aqui usamos '@/lib/auth-server')
    const { authOptions } = await import('@/lib/auth-server');
    const s: any = await getServerSession(authOptions as any);
    if (s?.user?.email) {
      try {
        const user = await prisma.user.findFirst({
          where: { email: s.user.email },
        });
        if (user) return user as any;
      } catch {
        // Fallback para dados do token se o banco estiver indisponível
        return {
          id: s.user.id,
          email: s.user.email,
          name: s.user.name,
          role: s.user.role,
        } as any;
      }
      // Se não encontrou no banco, ainda assim retorne sessão
      return {
        id: s.user.id,
        email: s.user.email,
        name: s.user.name,
        role: s.user.role,
      } as any;
    }
  } catch {}

  // 2) Cookie próprio (ex.: "kl.session" com userId em JWT/JSON)
  const cookie = (await cookies()).get('kl.session')?.value;
  if (!cookie) return null;
  try {
    // Se for JWT, decodifique aqui. Para agora, considere JSON {userId:"..."}:
    const data = JSON.parse(
      Buffer.from(cookie.split('.').at(1) ?? '', 'base64url').toString() || '{}'
    );
    const userId = (data as any)?.userId ?? (data as any)?.sub ?? null;
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
    });
    return user as any;
  } catch {
    return null;
  }
}
