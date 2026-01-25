'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';
import { removeLeadsterScript } from '@/components/landing/LeadsterIntegration';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated') {
      // Remover Leadster imediatamente ao autenticar
      removeLeadsterScript();
      
      // Remover novamente após um pequeno delay para garantir que elementos dinâmicos sejam removidos
      const timeout1 = setTimeout(() => {
        removeLeadsterScript();
      }, 100);
      
      const timeout2 = setTimeout(() => {
        removeLeadsterScript();
      }, 500);
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, [status, router]);
  
  // Garantir que Leadster seja removido sempre que entrar em área autenticada
  useEffect(() => {
    // Remover imediatamente
    removeLeadsterScript();
    
    // Remover após um delay para pegar elementos que podem ser criados dinamicamente
    const interval = setInterval(() => {
      removeLeadsterScript();
    }, 1000);
    
    // Monitorar mudanças de rota para remover Leadster
    const handleRouteChange = () => {
      removeLeadsterScript();
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Observar mudanças no DOM para remover elementos do Leadster que possam aparecer
    const observer = new MutationObserver(() => {
      const hasLeadster = document.querySelector('[id*="neurolead"], [id*="leadster"], [class*="neurolead"], [class*="leadster"]');
      if (hasLeadster) {
        removeLeadsterScript();
      }
      
      // Remover widgets de chat com imagens de pessoas no footer e elementos azuis fixos
      const chatWidgets = document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"], div[style*="position: fixed"], iframe[style*="position: fixed"], iframe[style*="position:fixed"]');
      chatWidgets.forEach(widget => {
        const hasPeopleImages = widget.querySelector('img[src*="people"], img[src*="person"], img[alt*="chat"], img[alt*="atendimento"], img[alt*="whatsapp"]');
        const widgetHTML = widget.innerHTML || '';
        const widgetId = widget.id || '';
        const widgetClass = widget.className || '';
        const widgetStyle = (widget as HTMLElement).style?.cssText || '';
        
        // Verificar se tem cor azul no background ou border (widgets de marketing geralmente têm isso)
        const hasBlueColor = widgetStyle.includes('background') && (
          widgetStyle.includes('rgb(59, 130, 246)') || // blue-500
          widgetStyle.includes('rgb(37, 99, 235)') || // blue-600
          widgetStyle.includes('#3b82f6') || // blue-500 hex
          widgetStyle.includes('#2563eb') || // blue-600 hex
          widgetStyle.includes('blue')
        );
        
        // Verificar se está posicionado no bottom (footer)
        const isAtBottom = widgetStyle.includes('bottom') || 
                          widgetId.includes('footer') ||
                          widgetClass.includes('footer') ||
                          (widget as HTMLElement).getBoundingClientRect().bottom > window.innerHeight * 0.8;
        
        // Verificar se é um widget de chat/marketing
        if (
          hasPeopleImages || 
          widgetHTML.includes('neurolead') || 
          widgetHTML.includes('leadster') ||
          widgetId.includes('neurolead') ||
          widgetId.includes('leadster') ||
          widgetClass.includes('neurolead') ||
          widgetClass.includes('leadster') ||
          (widgetHTML.includes('chat') && widgetHTML.includes('widget')) ||
          (hasBlueColor && isAtBottom && !widgetHTML.includes('sonner') && !widgetHTML.includes('toast'))
        ) {
          // Verificar se não é um elemento legítimo da aplicação
          const isAppElement = widget.closest('[data-slot], [class*="card"], [class*="dialog"], [class*="toast"], [class*="sonner"], [id*="radix"]');
          if (!isAppElement) {
            try {
              widget.remove();
            } catch (e) {
              // Ignorar erros
            }
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
    };
  }, []);

  // Mostrar loading enquanto verifica autenticação
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, não renderizar nada (será redirecionado)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main content area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Topbar */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Page content */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
