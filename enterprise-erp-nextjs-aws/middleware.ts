import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const hostname = req.headers.get('host') || '';

  // Configuração de domínios e suas respectivas seções
  const domainConfig = {
    'checklist.klfacilities.com.br': {
      defaultPath: '/checklist-admin',
      publicPaths: ['/checklist', '/checklist-admin'],
      name: 'Checklist',
      requiresAuth: true,
    },
    'ponto.klfacilities.com.br': {
      defaultPath: '/ponto/admin',
      publicPaths: ['/ponto'],
      name: 'Ponto Eletrônico',
      requiresAuth: true,
    },
    'financeiro.klfacilities.com.br': {
      defaultPath: '/dashboard',
      publicPaths: ['/dashboard', '/movimentos', '/analytics'],
      name: 'Financeiro',
      requiresAuth: true,
    },
    'colaborador.klfacilities.com.br': {
      defaultPath: '/colaborador',
      publicPaths: ['/colaborador'],
      name: 'Central de Atendimento',
      requiresAuth: false,
    },
  };

  // PRIORIDADE: Verificar subdomínios ANTES de qualquer outra coisa
  // Verificar se é o subdomínio colaborador (pode ter porta ex: colaborador.klfacilities.com.br:3000)
  const hostnameBase = hostname.split(':')[0]; // Remove porta se houver

  if (hostnameBase === 'colaborador.klfacilities.com.br') {
    // Redirecionar raiz '/' ou qualquer rota que não seja /colaborador
    if (
      url.pathname === '/' ||
      (url.pathname !== '/colaborador' &&
        !url.pathname.startsWith('/colaborador'))
    ) {
      // Construir URL de redirecionamento mantendo protocolo e host
      const redirectUrl = new URL(req.url);
      redirectUrl.pathname = '/colaborador';
      return NextResponse.redirect(redirectUrl, 301);
    }
    // Se já estiver em /colaborador, permitir
    const response = NextResponse.next();
    response.headers.set('X-App-Section', 'Central de Atendimento');
    return response;
  }

  // Páginas públicas que não precisam de autenticação
  const publicPages = [
    '/',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/politica-privacidade', // Redirect para /compliance/privacidade
    '/compliance/privacidade',
    '/compliance/conformidade',
    '/banco-talentos',
    '/colaborador',
    '/links', // Página Linktree para Instagram
  ];

  // Páginas do sistema de ponto que devem ser públicas (VERIFICAR ANTES DE QUALQUER OUTRA COISA)
  const publicPontoPages = [
    '/ponto/scan',
    '/ponto/validar',
    '/ponto/u/', // Para páginas como /ponto/u/[slug]
    '/ponto/termo-ciencia', // Termo de ciência também deve ser público
  ];

  // APIs mobile devem ser públicas (ANTES de qualquer verificação de autenticação)
  if (url.pathname.startsWith('/api/mobile/')) {
    // Tratar preflight OPTIONS
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400', // 24 horas
        },
      });
    }
    
    const response = NextResponse.next();
    // Adicionar CORS headers para permitir requisições do app mobile
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Verificar se é uma página de ponto pública ANTES de verificar domínio
  // Isso garante que funcionários possam acessar mesmo de qualquer domínio
  if (publicPontoPages.some(page => url.pathname.startsWith(page))) {
    const response = NextResponse.next();
    // Se for subdomínio de ponto, adicionar header mas não bloquear
    if (hostnameBase === 'ponto.klfacilities.com.br') {
      response.headers.set('X-App-Section', 'Ponto Eletrônico');
    }
    return response;
  }

  // Para outros domínios configurados (financeiro, ponto, checklist)
  if (hostnameBase in domainConfig) {
    const config = domainConfig[hostnameBase as keyof typeof domainConfig];

    // Se estiver na raiz, verificar autenticação antes de redirecionar
    if (url.pathname === '/') {
      // Se requer autenticação, verificar token primeiro
      if (config.requiresAuth) {
        const token = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET,
        });

        // Se não estiver logado, redirecionar para login
        if (!token) {
          const loginUrl = new URL('/login', req.url);
          loginUrl.searchParams.set('callbackUrl', config.defaultPath);
          return NextResponse.redirect(loginUrl, 302);
        }
      }

      // Se estiver logado ou não requer auth, redirecionar para página padrão
      return NextResponse.redirect(new URL(config.defaultPath, req.url), 301);
    }

    // Adicionar header para identificar a seção
    const response = NextResponse.next();
    response.headers.set('X-App-Section', config.name);
    return response;
  }

  // Verificar se é a página raiz do ponto (pode precisar de auth dependendo do contexto)
  if (url.pathname === '/ponto') {
    // Permitir acesso público à página raiz do ponto
    return NextResponse.next();
  }

  // APIs públicas (ponto eletrônico e banco de talentos)
  const publicApiPaths = [
    '/api/ponto/slug',
    '/api/ponto/funcionario',
    '/api/ponto/bater',
    '/api/ponto/resolve',
    '/api/ponto/registros',
    '/api/ponto/folha',
    '/api/ponto/protocolo',
    '/api/ponto/verificar-hoje', // Nova API para verificar tipos batidos hoje
    '/api/ponto/termo-ciencia', // API do termo de ciência
    '/api/auth',
    '/api/health',
    '/api/curriculos/unidades',
    '/api/curriculos/upload',
    '/api/manifestacoes', // POST é público, GET requer auth (verificado na rota)
    '/api/grupos', // Permitir acesso público apenas para listar grupos ativos
    '/api/unidades', // Permitir acesso público apenas para listar unidades ativas
    '/api/mobile', // APIs do app mobile (auth e ponto)
  ];

  // Permitir acesso a páginas públicas
  if (publicPages.includes(url.pathname)) {
    return NextResponse.next();
  }

  // Permitir acesso a APIs públicas
  if (publicApiPaths.some(path => url.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Se não tem token e não é página pública, redirecionar para login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const userRole = (token as any).role;

  // MASTER: acesso total a tudo, não precisa de validações adicionais
  if (userRole === 'MASTER') {
    return NextResponse.next();
  }

  // PROTEÇÃO ROBUSTA: Bloquear OPERACIONAL de acessar rotas financeiras
  if (userRole === 'OPERACIONAL') {
    // Rotas financeiras que OPERACIONAL não pode acessar
    const financeiroPaths = [
      '/dashboard',
      '/movimentos',
      '/provisionamento',
      '/api/movimentos',
      '/api/provisionamentos',
      '/api/financeiro',
      '/api/dashboard',
    ];

    const isFinanceiro = financeiroPaths.some(
      path => url.pathname.startsWith(path) || url.pathname === path
    );

    if (isFinanceiro) {
      console.log(
        `[MIDDLEWARE] OPERACIONAL tentou acessar rota financeira bloqueada: ${url.pathname}`
      );
      return NextResponse.redirect(new URL('/ponto/admin', req.url), 302);
    }
  }

  // PROTEÇÃO ROBUSTA: Bloquear RH de acessar rotas não permitidas
  if (userRole === 'RH') {
    // Rotas permitidas para RH
    const rhAllowedPaths = [
      '/ponto/admin', // Ponto Digital e todas as subrotas
      '/ponto/termos-ciencia',
      '/rh/banco-talentos',
      '/rh/central-atendimento',
      '/rh/processos',
      '/config/unidades', // Apenas visualizar (proteção adicional na página)
      '/config/grupos', // Apenas visualizar (proteção adicional na página)
      '/api', // APIs serão verificadas nas rotas individuais
    ];

    // Verificar se a rota atual é permitida
    const isAllowed = rhAllowedPaths.some(
      path => url.pathname.startsWith(path) || url.pathname === path
    );

    // Se não for permitida, redirecionar para /ponto/admin
    if (!isAllowed) {
      // Permitir apenas APIs específicas que RH precisa
      const rhAllowedApis = [
        '/api/ponto/',
        '/api/curriculos/',
        '/api/manifestacoes/',
        '/api/processos-juridicos/',
        '/api/grupos',
        '/api/unidades',
        '/api/auth/',
      ];

      const isApiAllowed = rhAllowedApis.some(api =>
        url.pathname.startsWith(api)
      );

      if (!isApiAllowed) {
        console.log(
          `[MIDDLEWARE] RH tentou acessar rota bloqueada: ${url.pathname}`
        );
        return NextResponse.redirect(new URL('/ponto/admin', req.url), 302);
      }
    }
  }

  // PROTEÇÃO ROBUSTA: Bloquear JURIDICO de acessar rotas não permitidas
  if (userRole === 'JURIDICO') {
    // Rotas permitidas APENAS para JURIDICO (apenas Processos Jurídicos)
    const juridicoAllowedPaths = [
      '/rh/processos',
      '/api/processos-juridicos/',
      '/api/auth/',
    ];

    // Verificar se a rota atual é permitida
    const isAllowed = juridicoAllowedPaths.some(
      path => url.pathname.startsWith(path) || url.pathname === path
    );

    // Se não for permitida, redirecionar para /rh/processos
    if (!isAllowed) {
      console.log(
        `[MIDDLEWARE] JURIDICO tentou acessar rota bloqueada: ${url.pathname}`
      );
      return NextResponse.redirect(new URL('/rh/processos', req.url), 302);
    }
  }

  // Proteção de rotas específicas por role
  const protectedByRole: Record<string, Array<string>> = {
    '/dashboard': ['MASTER', 'ADMIN', 'SUPERVISOR'], // MASTER e ADMIN podem acessar dashboard
    '/movimentos': ['MASTER', 'ADMIN'], // MASTER e ADMIN podem acessar movimentos
    '/provisionamento': ['MASTER', 'ADMIN'], // MASTER e ADMIN podem acessar provisionamento
    '/checklist-admin': ['MASTER', 'ADMIN', 'SUPERVISOR', 'OPERACIONAL'], // OPERACIONAL pode acessar avaliações
    '/config/usuarios': ['MASTER', 'ADMIN'], // MASTER e ADMIN podem acessar usuários
    '/config/responsaveis': ['MASTER', 'ADMIN', 'OPERACIONAL'], // MASTER, ADMIN e OPERACIONAL podem acessar responsáveis
    '/config/categorias': ['MASTER', 'ADMIN', 'SUPERVISOR', 'OPERACIONAL'], // OPERACIONAL pode acessar categorias
  };

  for (const [path, roles] of Object.entries(protectedByRole)) {
    if (url.pathname.startsWith(path) && token && !roles.includes(userRole)) {
      // Redirecionar baseado no role
      let redirectPath = '/dashboard';
      if (userRole === 'RH') {
        redirectPath = '/ponto/admin';
      } else if (userRole === 'JURIDICO') {
        redirectPath = '/rh/processos';
      } else if (userRole === 'OPERACIONAL') {
        redirectPath = '/ponto/admin';
      }
      console.log(
        `[MIDDLEWARE] Bloqueando acesso: ${userRole} tentou acessar ${url.pathname}`
      );
      return NextResponse.redirect(new URL(redirectPath, req.url), 302);
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|favicon.ico|public).*)'] };
