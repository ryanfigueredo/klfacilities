'use client';

import Link from 'next/link';
import { useAppSection, getSectionColor } from '@/hooks/useAppSection';

const sections = [
  {
    key: 'financeiro',
    name: 'Financeiro',
    url: 'https://financeiro.klfacilities.com.br',
    color: 'bg-purple-600',
    description: 'Controle financeiro e movimentações'
  },
  {
    key: 'checklist',
    name: 'Checklist',
    url: 'https://checklist.klfacilities.com.br',
    color: 'bg-green-600',
    description: 'Gestão de checklists e conformidade'
  },
  {
    key: 'ponto',
    name: 'Ponto Eletrônico',
    url: 'https://ponto.klfacilities.com.br',
    color: 'bg-blue-600',
    description: 'Controle de ponto e folha de pagamento'
  }
];

export function SectionNavigation() {
  const currentSection = useAppSection();

  return (
    <div className="flex items-center space-x-2 text-sm">
      {sections.map((section) => {
        const isCurrent = section.key === currentSection;
        
        return (
          <Link
            key={section.key}
            href={section.url}
            className={`
              flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors
              ${isCurrent 
                ? `${section.color} text-white` 
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            title={section.description}
          >
            <div className={`w-2 h-2 rounded-full ${section.color}`} />
            <span>{section.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
