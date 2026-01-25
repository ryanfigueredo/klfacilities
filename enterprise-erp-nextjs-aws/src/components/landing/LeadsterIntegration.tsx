'use client';

import React, { useEffect, useState } from 'react';

/**
 * Verifica se a rota atual é pública (não autenticada)
 */
export function isPublicRoute(path?: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const currentPath = path || window.location.pathname;
  
  // Rotas autenticadas (não devem ter Leadster)
  const authenticatedRoutes = [
    '/dashboard',
    '/config',
    '/movimentos',
    '/analytics',
    '/ponto/admin',
    '/ponto/termos-ciencia',
    '/ponto/supervisor',
    '/checklist-admin',
    '/checklist',
    '/operacional/checklists',
    '/banco-talentos',
    '/financeiro',
    '/colaborador',
    '/login',
    '/operacional',
    '/rh',
    '/provisionamento',
  ];
  
  // Verificar se a rota começa com alguma rota autenticada
  const isAuthenticated = authenticatedRoutes.some(route => 
    currentPath.startsWith(route)
  );
  
  // Verificar se está dentro de grupo (app) - rotas autenticadas
  // Mas compliance é público, então vamos permitir
  const isAppRoute = currentPath.startsWith('/(app)');
  
  // Verificar se é rota de checklist (todas são autenticadas)
  const isChecklistRoute = currentPath.includes('/checklist') || currentPath.includes('/operacional/checklists');
  
  // Retornar true apenas se for rota pública
  return !isAuthenticated && !isAppRoute && !isChecklistRoute;
}

/**
 * Remove o script do Leadster do DOM e todos os elementos relacionados
 */
export function removeLeadsterScript() {
  if (typeof window === 'undefined') return;
  
  // Remover script
  const existingScript = document.querySelector('script[src*="neurolead"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Remover todos os elementos DOM criados pelo Leadster
  // O Leadster geralmente cria elementos com IDs ou classes específicas
  const leadsterElements = [
    ...document.querySelectorAll('[id*="neurolead"]'),
    ...document.querySelectorAll('[id*="leadster"]'),
    ...document.querySelectorAll('[class*="neurolead"]'),
    ...document.querySelectorAll('[class*="leadster"]'),
    ...document.querySelectorAll('iframe[src*="leadster"]'),
    ...document.querySelectorAll('div[data-leadster]'),
  ];
  
  leadsterElements.forEach(el => {
    try {
      el.remove();
    } catch (e) {
      // Ignorar erros na remoção
    }
  });
  
  // Remover elementos que podem conter o widget flutuante (mais agressivo)
  const floatingWidgets = document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"], div[style*="position: fixed"]');
  floatingWidgets.forEach(widget => {
    const widgetHTML = widget.innerHTML || '';
    const widgetId = widget.id || '';
    const widgetClass = widget.className || '';
    // Verificar se contém referências ao Leadster ou se está no canto inferior direito (onde geralmente aparece)
    if (
      widgetHTML.includes('neurolead') || 
      widgetHTML.includes('leadster') ||
      widgetId.includes('neurolead') ||
      widgetId.includes('leadster') ||
      widgetClass.includes('neurolead') ||
      widgetClass.includes('leadster') ||
      (widgetHTML.includes('chat') && widgetHTML.includes('widget'))
    ) {
      try {
        widget.remove();
      } catch (e) {
        // Ignorar erros
      }
    }
  });
  
  // Remover também elementos com imagens de pessoas no footer (widgets de chat geralmente têm isso)
  const chatWidgets = document.querySelectorAll('div[style*="bottom"], div[style*="right"]');
  chatWidgets.forEach(widget => {
    const hasPeopleImages = widget.querySelector('img[src*="people"], img[src*="person"], img[alt*="chat"], img[alt*="atendimento"]');
    const widgetHTML = widget.innerHTML || '';
    if (hasPeopleImages || widgetHTML.includes('chat') || widgetHTML.includes('atendimento') || widgetHTML.includes('whatsapp')) {
      // Verificar se não é um elemento legítimo da aplicação
      const isAppElement = widget.closest('[data-slot], [class*="card"], [class*="dialog"]');
      if (!isAppElement) {
        try {
          widget.remove();
        } catch (e) {
          // Ignorar erros
        }
      }
    }
  });
  
  // Limpar variável global e widget
  try {
    delete (window as any).neuroleadId;
    // Tentar destruir o widget se existir
    if ((window as any).neurolead) {
      if (typeof (window as any).neurolead.destroy === 'function') {
        (window as any).neurolead.destroy();
      }
      if (typeof (window as any).neurolead.hide === 'function') {
        (window as any).neurolead.hide();
      }
    }
    delete (window as any).neurolead;
    
    // Limpar também outras variáveis globais que o Leadster pode criar
    delete (window as any).Leadster;
    delete (window as any).leadster;
  } catch (e) {
    // Ignorar erros na limpeza
  }
  
  // Forçar remoção de estilos inline que podem estar relacionados
  const styleElements = document.querySelectorAll('style');
  styleElements.forEach(style => {
    if (style.textContent?.includes('neurolead') || style.textContent?.includes('leadster')) {
      try {
        style.remove();
      } catch (e) {
        // Ignorar erros
      }
    }
  });
  
  // Remover elementos fixos no footer com imagens de pessoas (widgets de chat) e elementos azuis
  const footerWidgets = document.querySelectorAll('div[style*="bottom"], div[style*="right"], iframe[style*="bottom"], div[style*="position: fixed"], div[style*="position:fixed"]');
  footerWidgets.forEach(widget => {
    const widgetHTML = widget.innerHTML || '';
    const widgetId = widget.id || '';
    const widgetClass = widget.className || '';
    const widgetStyle = (widget as HTMLElement).style?.cssText || '';
    const hasPeopleImages = widget.querySelector('img[src*="people"], img[src*="person"], img[alt*="chat"], img[alt*="atendimento"], img[alt*="whatsapp"]');
    
    // Verificar se tem cor azul no background (widgets de marketing geralmente têm isso)
    const hasBlueColor = widgetStyle.includes('background') && (
      widgetStyle.includes('rgb(59, 130, 246)') || // blue-500
      widgetStyle.includes('rgb(37, 99, 235)') || // blue-600
      widgetStyle.includes('#3b82f6') || // blue-500 hex
      widgetStyle.includes('#2563eb') || // blue-600 hex
      widgetStyle.includes('blue') ||
      widgetClass.includes('bg-blue')
    );
    
    // Verificar se está posicionado no bottom (footer)
    const isAtBottom = widgetStyle.includes('bottom') || 
                      widgetId.includes('footer') ||
                      widgetClass.includes('footer') ||
                      ((widget as HTMLElement).getBoundingClientRect && (widget as HTMLElement).getBoundingClientRect().bottom > window.innerHeight * 0.8);
    
    // Verificar se é um widget de chat/marketing
    if (
      hasPeopleImages ||
      widgetHTML.includes('neurolead') || 
      widgetHTML.includes('leadster') ||
      widgetId.includes('neurolead') ||
      widgetId.includes('leadster') ||
      widgetClass.includes('neurolead') ||
      widgetClass.includes('leadster') ||
      (widgetHTML.includes('chat') && (widgetHTML.includes('widget') || widgetHTML.includes('floating'))) ||
      (widgetHTML.includes('whatsapp') && widgetHTML.includes('button')) ||
      (hasBlueColor && isAtBottom && !widgetHTML.includes('sonner') && !widgetHTML.includes('toast'))
    ) {
      // Verificar se não é um elemento legítimo da aplicação
      const isAppElement = widget.closest('[data-slot], [class*="card"], [class*="dialog"], [class*="toast"], [class*="sonner"], [id*="radix"], [class*="sidebar"], [class*="topbar"]');
      if (!isAppElement) {
        try {
          widget.remove();
        } catch (e) {
          // Ignorar erros
        }
      }
    }
  });
}

/**
 * Função utilitária para carregar o Leadster apenas em páginas públicas
 */
export function loadLeadsterScript() {
  if (!isPublicRoute()) {
    removeLeadsterScript();
    return;
  }

  // Carregar script apenas em rotas públicas
  try {
    const head = document.head || document.getElementsByTagName('head')[0];
    const existingScript = document.querySelector('script[src*="neurolead"]');

    if (!existingScript) {
      const script = document.createElement('script');
      script.setAttribute('src', 'https://cdn.leadster.com.br/neurolead/neurolead.min.js');
      script.setAttribute('charset', 'UTF-8');
      script.defer = true;
      
      // @ts-ignore
      window.neuroleadId = 'ApjlYlCIii1LeHr595ofKwd8L';
      
      head.appendChild(script);
    }
  } catch (error) {
    console.error('Erro ao carregar Leadster:', error);
  }
}

/**
 * Componente para integração do Leadster
 * Script integrado com o ID: ApjlYlCIii1LeHr595ofKwd8L
 * Só carrega em páginas públicas (não autenticadas)
 */
export function LeadsterIntegration() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Verificar se deve renderizar apenas no cliente
    if (typeof window === 'undefined') return;

    // Verificar se é rota pública
    const isPublic = isPublicRoute();
    setShouldRender(isPublic);

    if (isPublic) {
      loadLeadsterScript();
    } else {
      removeLeadsterScript();
    }

    // Monitorar mudanças de rota usando next/navigation
    const handleRouteChange = () => {
      const isPublic = isPublicRoute();
      setShouldRender(isPublic);
      
      if (isPublic) {
        loadLeadsterScript();
      } else {
        removeLeadsterScript();
      }
    };

    // Observar mudanças no pathname através do evento popstate
    window.addEventListener('popstate', handleRouteChange);

    // Observar mudanças no DOM (para SPAs)
    const observer = new MutationObserver(() => {
      // Verificar se mudou o pathname
      const currentPath = window.location.pathname;
      const lastPath = sessionStorage.getItem('lastPath');
      if (lastPath !== currentPath) {
        sessionStorage.setItem('lastPath', currentPath);
        handleRouteChange();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
    };
  }, []);

  // Não renderizar até verificar no cliente (evita erro de hidratação)
  if (!shouldRender) {
    return null;
  }

  return (
    <div id="contact" className="py-8 sm:py-12 bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* O widget do Leadster aparecerá automaticamente aqui */}
      </div>
    </div>
  );
}

