'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  FolderOpen,
  Users,
  Eye,
  Plus,
  Palette,
  Network,
} from 'lucide-react';
import Link from 'next/link';
import { useCurrentUserRole } from '@/lib/session-client';
import { hasRouteAccess } from '@/lib/rbac';

export default function ConfigPage() {
  const userRole = useCurrentUserRole() as 'MASTER' | 'ADMIN' | 'RH' | 'SUPERVISOR' | 'OPERACIONAL' | undefined;

  const configSections = [
    {
      title: 'Colaboradores',
      description:
        'Cadastro de funcionários (nome, CPF, grupo/unidade) e importação por PDF',
      icon: Users,
      href: '/rh/colaboradores',
      canView: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'RH', 'OPERACIONAL']),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'RH']),
    },
    {
      title: 'Unidades',
      description: 'Gerencie unidades organizacionais',
      icon: Building2,
      href: '/config/unidades',
      canView: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'RH', 'OPERACIONAL']),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']),
    },
    {
      title: 'Grupos',
      description: 'Gerencie grupos para agrupamento de movimentos',
      icon: FolderOpen,
      href: '/config/grupos',
      canView: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'RH', 'OPERACIONAL']),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']),
    },
    {
      title: 'Gasolina',
      description: 'Controle de gasolina, rotas e conciliação TicketLog',
      icon: FolderOpen,
      href: '/operacional/controle-gasolina/admin',
      canView: hasRouteAccess(userRole, [
        'MASTER',
        'ADMIN',
        'RH',
        'SUPERVISOR',
        'OPERACIONAL',
      ]),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']),
    },
    {
      title: 'Folha de Ponto',
      description:
        'Administração e relatórios do ponto (QR, validação, exportações)',
      icon: FolderOpen,
      href: '/ponto/admin',
      canView: hasRouteAccess(userRole, [
        'MASTER',
        'ADMIN',
        'RH',
        'SUPERVISOR',
        'OPERACIONAL',
      ]),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN']),
    },
    {
      title: 'Supervisores',
      description: 'Gerencie escopos e permissões de supervisores',
      icon: Users,
      href: '/config/supervisores',
      canView: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']),
    },
    {
      title: 'Usuários',
      description: 'Gerencie usuários e suas permissões',
      icon: Users,
      href: '/config/usuarios',
      canView: hasRouteAccess(userRole, ['MASTER', 'ADMIN']),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN']),
    },
    {
      title: 'Branding & White Label',
      description: 'Personalize logo, cores e identidade visual do ERP',
      icon: Palette,
      href: '/config/branding',
      canView: hasRouteAccess(userRole, ['MASTER', 'ADMIN']),
      canEdit: hasRouteAccess(userRole, ['MASTER', 'ADMIN']),
    },
    {
      title: 'Organograma',
      description: 'Visualização hierárquica da estrutura organizacional em tempo real',
      icon: Network,
      href: '/config/organograma',
      canView: hasRouteAccess(userRole, ['MASTER', 'ADMIN', 'OPERACIONAL']),
      canEdit: false,
    },
  ];

  // Ordena alfabeticamente por título
  const sections = [...configSections].sort((a, b) =>
    a.title.localeCompare(b.title, 'pt-BR')
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sections.map(section => {
          const Icon = section.icon;

          if (!section.canView) return null;

          return (
            <Card
              key={section.href}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {section.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs mb-4">
                  {section.description}
                </CardDescription>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={section.href}>
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Link>
                  </Button>
                  {section.canEdit && (
                    <Button asChild size="sm">
                      <Link href={`${section.href}?action=create`}>
                        <Plus className="h-4 w-4 mr-1" />
                        Novo
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
