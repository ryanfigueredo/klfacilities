import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth-utils';
import { logLogin } from '@/lib/audit/log';
import { generateJWT } from '@/lib/jwt';

/**
 * OPTIONS /api/mobile/auth-admin
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 horas
    },
  });
}

/**
 * POST /api/mobile/auth-admin
 * Autenticação para app mobile de administradores/supervisores - valida email e senha
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.password) {
      try {
        await logLogin(
          null,
          email,
          'unknown',
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'mobile-admin',
          false,
          'Usuário não encontrado'
        );
      } catch (error) {
        console.error('Erro ao logar tentativa de login:', error);
      }

      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se o usuário está ativo
    if (user.ativo === false) {
      try {
        await logLogin(
          user.id,
          email,
          user.role,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          'mobile-admin',
          false,
          'Usuário desativado'
        );
      } catch (error) {
        console.error('Erro ao logar tentativa de login:', error);
      }
      
      return NextResponse.json(
        { error: 'Usuário desativado' },
        { status: 403 }
      );
    }

    // Verificar senha
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      try {
        await logLogin(
          user.id,
          email,
          user.role,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          'mobile-admin',
          false,
          'Senha incorreta'
        );
      } catch (error) {
        console.error('Erro ao logar tentativa de login:', error);
      }
      
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se o role permite acesso ao app mobile
    const allowedRoles = ['MASTER', 'ADMIN', 'SUPERVISOR', 'RH', 'OPERACIONAL', 'GESTOR'];
    if (!allowedRoles.includes(user.role)) {
      try {
        await logLogin(
          user.id,
          email,
          user.role,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          'mobile-admin',
          false,
          'Role não permitido para acesso mobile'
        );
      } catch (error) {
        console.error('Erro ao logar tentativa de login:', error);
      }
      
      return NextResponse.json(
        { error: 'Seu perfil não tem permissão para acessar o aplicativo' },
        { status: 403 }
      );
    }

    // Log de login bem-sucedido
    try {
      await logLogin(
        user.id,
        user.email,
        user.role,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'mobile-admin',
        true
      );
    } catch (error) {
      console.error('Erro ao logar login bem-sucedido:', error);
    }

    // Gerar token JWT para o usuário
    const token = generateJWT(user.id, user.email, user.role);

    // Retornar informações do usuário e token
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token, // Token JWT para autenticação nas próximas requisições
    });
    
    // CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error: any) {
    console.error('Erro na autenticação mobile admin:', error);
    return NextResponse.json(
      { error: 'Erro ao autenticar' },
      { status: 500 }
    );
  }
}
