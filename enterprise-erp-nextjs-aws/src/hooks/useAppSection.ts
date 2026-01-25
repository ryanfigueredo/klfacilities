'use client';

import { useEffect, useState } from 'react';

export type AppSection = 'checklist' | 'ponto' | 'financeiro' | 'default';

export function useAppSection(): AppSection {
  const [section, setSection] = useState<AppSection>('default');

  useEffect(() => {
    const hostname = window.location.hostname;
    
    if (hostname.includes('checklist.klfacilities.com.br')) {
      setSection('checklist');
    } else if (hostname.includes('ponto.klfacilities.com.br')) {
      setSection('ponto');
    } else if (hostname.includes('financeiro.klfacilities.com.br')) {
      setSection('financeiro');
    } else {
      setSection('default');
    }
  }, []);

  return section;
}

export function getSectionTitle(section: AppSection): string {
  switch (section) {
    case 'checklist':
      return 'Checklist';
    case 'ponto':
      return 'Ponto Eletrônico';
    case 'financeiro':
      return 'Financeiro';
    default:
      return 'KL ERP';
  }
}

export function getSectionColor(section: AppSection): string {
  switch (section) {
    case 'checklist':
      return 'bg-green-600';
    case 'ponto':
      return 'bg-blue-600';
    case 'financeiro':
      return 'bg-purple-600';
    default:
      return 'bg-gray-600';
  }
}
