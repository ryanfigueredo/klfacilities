'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, HomeIcon, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
  const fetchedTitlesRef = useRef<Set<string>>(new Set());

  // Fetch custom title for checklist responder pages
  useEffect(() => {
    // Skip if it's an auth or root path
    if (
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/api')
    ) {
      return;
    }

    const segments = pathname.split('/').filter(Boolean);
    const responderIndex = segments.indexOf('responder');
    
    if (responderIndex !== -1 && responderIndex + 1 < segments.length) {
      const escopoId = segments[responderIndex + 1];
      
      // Check if it's a UUID and we haven't fetched the title yet
      if (isUUID(escopoId) && !fetchedTitlesRef.current.has(escopoId)) {
        fetchedTitlesRef.current.add(escopoId);
        let isCancelled = false;
        
        fetch(`/api/checklists-operacionais/escopos/${escopoId}/breadcrumb`)
          .then(res => res.json())
          .then(data => {
            if (!isCancelled && data.title) {
              setCustomTitles(prev => ({ ...prev, [escopoId]: data.title }));
            }
          })
          .catch(error => {
            if (!isCancelled) {
              console.error('Erro ao buscar título do breadcrumb:', error);
            }
          });
        
        return () => {
          isCancelled = true;
        };
      }
    }
  }, [pathname]);

  // Skip auth and root paths
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api')
  ) {
    return null;
  }

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, array) => {
      const href = '/' + array.slice(0, index + 1).join('/');
      const isLast = index === array.length - 1;

      // Check if this is a UUID in a responder route
      const responderIndex = array.indexOf('responder');
      if (
        responderIndex !== -1 &&
        index === responderIndex + 1 &&
        isUUID(segment)
      ) {
        // If we have a custom title, use it; otherwise show "Checklist"
        const displayName = customTitles[segment] || 'Checklist';
        return { name: displayName, href, isLast };
      }

      // Format segment name
      const name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return { name, href, isLast };
    });

  return (
    <nav className="hidden md:flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground border-b border-border bg-background/50 backdrop-blur-sm relative z-10">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <HomeIcon className="h-4 w-4" />
        <span>Início</span>
      </Link>

      {segments.map((segment, index) => (
        <div key={segment.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {segment.isLast ? (
            <span className="font-medium text-foreground">{segment.name}</span>
          ) : (
            <Link
              href={segment.href}
              className="hover:text-foreground transition-colors"
            >
              {segment.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
