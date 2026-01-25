'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { appNavSections, type NavItem } from './nav';
import { Logo } from '@/components/ui/logo';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ open, onClose, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(pathname?.startsWith('/config') ? ['/config'] : [])
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Financeiro', 'Operacional', 'RH', 'Administração', 'Configurações'])
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  const toggleItem = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  };

  const isItemActive = (item: NavItem): boolean => {
    // Item pai só é ativo se o pathname for exatamente igual ao href do pai
    if (pathname === item.href) return true;
    // Não considerar o pai ativo se algum filho estiver ativo
    if (item.children) {
      const hasActiveChild = item.children.some((child) => pathname === child.href || pathname?.startsWith(child.href + '/'));
      // Se tem filho ativo, o pai não deve ser considerado ativo
      return false;
    }
    return false;
  };

  const filterItemsByRole = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => item.roles.includes(userRole as any));
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden bg-card border-r border-border lg:block transition-all duration-300 ease-in-out overflow-visible',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div
            className={cn(
              'flex h-16 items-center border-b border-border transition-all duration-300',
              isCollapsed ? 'justify-center px-0' : 'px-6'
            )}
          >
            {isCollapsed ? <Logo size="sm" /> : <Logo size="md" />}
          </div>

          {/* Toggle button */}
          <div className="absolute top-20 right-0 translate-x-1/2">
            <button
              onClick={handleToggleCollapse}
              className="rounded-full bg-background border-2 border-primary/20 p-2 shadow-lg hover:bg-accent hover:border-primary/40 transition-all z-10"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-primary" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-primary" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav
            className={cn(
              'flex-1 overflow-hidden transition-all duration-300 relative',
              isCollapsed ? 'p-2' : 'p-4'
            )}
          >
            <div
              className={cn(
                'h-full overflow-y-auto overflow-x-visible space-y-6 pr-1',
                isCollapsed && 'space-y-4'
              )}
            >
              {appNavSections.map((section, sectionIndex) => {
                const filteredItems = filterItemsByRole(section.items);
                if (filteredItems.length === 0) return null;

                const isSectionExpanded = expandedSections.has(section.title);

                return (
                  <div key={section.title} className={cn(isCollapsed && 'space-y-2', 'relative')}>
                    {!isCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="w-full px-3 mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                      >
                        <span>{section.title}</span>
                        {isSectionExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    {isCollapsed && sectionIndex > 0 && (
                      <div className="h-px bg-border mx-2 my-2" />
                    )}
                    {(!isCollapsed && isSectionExpanded) || isCollapsed ? (
                      <div className={cn('space-y-1', isCollapsed && 'space-y-2')}>
                      {filteredItems.map((item) => {
                        const isActive = isItemActive(item);
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedItems.has(item.href);

                        if (isCollapsed && hasChildren) return null;

                        // Quando colapsado, mostra apenas indicador visual minimalista estilo SaaS
                        if (isCollapsed) {
                          const TooltipItem = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
                            const itemRef = useRef<HTMLDivElement>(null);
                            const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
                            const [isHovered, setIsHovered] = useState(false);

                            const updateTooltipPosition = () => {
                              if (itemRef.current) {
                                const rect = itemRef.current.getBoundingClientRect();
                                setTooltipPosition({
                                  left: rect.right + 12,
                                  top: rect.top + rect.height / 2,
                                });
                              }
                            };

                            const handleMouseEnter = () => {
                              updateTooltipPosition();
                              setIsHovered(true);
                            };

                            const handleMouseLeave = () => {
                              setIsHovered(false);
                            };

                            useEffect(() => {
                              const handleResize = () => {
                                if (isHovered) {
                                  updateTooltipPosition();
                                }
                              };

                              window.addEventListener('resize', handleResize);
                              window.addEventListener('scroll', handleResize, true);
                              return () => {
                                window.removeEventListener('resize', handleResize);
                                window.removeEventListener('scroll', handleResize, true);
                              };
                            }, [isHovered]);

                            return (
                              <div 
                                ref={itemRef} 
                                className="relative group"
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                              >
                                <Link
                                  href={item.href}
                                  target={item.href.startsWith('http') ? '_blank' : undefined}
                                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                  className={cn(
                                    'relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200',
                                    isActive
                                      ? 'bg-primary'
                                      : 'hover:bg-accent/50'
                                  )}
                                >
                                  {/* Barra lateral indicadora quando ativo */}
                                  <div
                                    className={cn(
                                      'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full transition-all duration-200',
                                      isActive
                                        ? 'bg-primary-foreground'
                                        : 'bg-transparent'
                                    )}
                                  />
                                  {/* Bolinha indicadora - sempre visível mas destacada quando ativo */}
                                  <div
                                    className={cn(
                                      'w-2 h-2 rounded-full transition-all duration-200',
                                      isActive
                                        ? 'bg-primary-foreground'
                                        : 'bg-muted-foreground opacity-40 group-hover:opacity-70'
                                    )}
                                  />
                                </Link>
                                {/* Tooltip flutuante no hover - aparece FORA do sidebar, à direita */}
                                {tooltipPosition && (
                                  <div 
                                    className="fixed px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-md shadow-2xl pointer-events-none whitespace-nowrap z-[99999] transition-all duration-200"
                                    style={{ 
                                      left: `${tooltipPosition.left}px`,
                                      top: `${tooltipPosition.top}px`,
                                      transform: 'translateY(-50%)',
                                      opacity: isHovered ? 1 : 0,
                                      transformOrigin: 'left center',
                                    }}
                                  >
                                    {item.label}
                                    {/* Seta apontando para a bolinha */}
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                                  </div>
                                )}
                              </div>
                            );
                          };

                          return <TooltipItem key={item.href} item={item} isActive={isActive} />;
                        }

                        // Quando expandido, mostra normalmente
                        return (
                          <div key={item.href}>
                            {hasChildren ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleItem(item.href)}
                                  className={cn(
                                    'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                      ? 'bg-primary text-primary-foreground'
                                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                  )}
                                >
                                  <span className="flex-1 text-left">{item.label}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                  )}
                                </button>
                                {isExpanded && (
                                  <div className="ml-4 mt-1 space-y-1">
                                    {filterItemsByRole(item.children || []).map((child) => {
                                      // Verificar se o child está ativo
                                      // Se o child.href é igual ao item.href (como Dashboard), só ativo se pathname for exatamente igual
                                      // Caso contrário, verifica se pathname começa com child.href + '/'
                                      const isChildActive = child.href === item.href
                                        ? pathname === child.href
                                        : pathname === child.href || pathname?.startsWith(child.href + '/');
                                      return (
                                        <Link
                                          key={child.href}
                                          href={child.href}
                                          className={cn(
                                            'relative flex items-center rounded-lg px-3 py-2 pl-4 text-sm transition-colors before:absolute before:left-2 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-transparent before:transition-colors',
                                            isChildActive
                                              ? 'bg-primary/10 text-primary font-medium before:bg-primary'
                                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:before:bg-accent'
                                          )}
                                        >
                                          {child.label}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <Link
                                href={item.href}
                                target={item.href.startsWith('http') ? '_blank' : undefined}
                                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className={cn(
                                  'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                  isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                              >
                                {item.label}
                              </Link>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:hidden">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-border px-6">
                <Logo size="md" />
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 hover:bg-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6">
                  {appNavSections.map((section) => {
                    const filteredItems = filterItemsByRole(section.items);
                    if (filteredItems.length === 0) return null;

                    const isSectionExpanded = expandedSections.has(section.title);

                    return (
                      <div key={section.title}>
                        <button
                          type="button"
                          onClick={() => toggleSection(section.title)}
                          className="w-full px-3 mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          <span>{section.title}</span>
                          {isSectionExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                        {isSectionExpanded && (
                          <div className="space-y-1">
                          {filteredItems.map((item) => {
                            const isActive = isItemActive(item);
                            const hasChildren = item.children && item.children.length > 0;
                            const isExpanded = expandedItems.has(item.href);

                            return (
                              <div key={item.href}>
                                {hasChildren ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => toggleItem(item.href)}
                                      className={cn(
                                        'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                          ? 'bg-primary text-primary-foreground'
                                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                      )}
                                    >
                                      <span className="flex-1 text-left">{item.label}</span>
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                      )}
                                    </button>
                                    {isExpanded && (
                                      <div className="ml-4 mt-1 space-y-1">
                                    {filterItemsByRole(item.children || []).map((child) => {
                                      // Verificar se o child está ativo
                                      // Se o child.href é igual ao item.href (como Dashboard), só ativo se pathname for exatamente igual
                                      // Caso contrário, verifica se pathname começa com child.href + '/'
                                      const isChildActive = child.href === item.href
                                        ? pathname === child.href
                                        : pathname === child.href || pathname?.startsWith(child.href + '/');
                                          return (
                                            <Link
                                              key={child.href}
                                              href={child.href}
                                              onClick={onClose}
                                          className={cn(
                                            'relative flex items-center rounded-lg px-3 py-2 pl-4 text-sm transition-colors before:absolute before:left-2 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-transparent before:transition-colors',
                                            isChildActive
                                              ? 'bg-primary/10 text-primary font-medium before:bg-primary'
                                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:before:bg-accent'
                                          )}
                                            >
                                              {child.label}
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <Link
                                    href={item.href}
                                    target={item.href.startsWith('http') ? '_blank' : undefined}
                                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    onClick={onClose}
                                    className={cn(
                                      'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                      isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    )}
                                  >
                                    {item.label}
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}