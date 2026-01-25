'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';

type SankeyRow = { from: string; to: string; value: number };

export default function SankeyGrupoCategoria() {
  const { filters } = useAnalyticsFilters();
  const [rows, setRows] = useState<SankeyRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const params = new URLSearchParams();
      if (filters.start) params.set('start', filters.start);
      if (filters.end) params.set('end', filters.end);
      const r = await fetch(`/api/analytics/by-grupo?${params}`);
      if (!r.ok) return;
      const j = await r.json();
      if (!active) return;
      const out: SankeyRow[] = [];
      for (const g of j.grupos || []) {
        for (const u of g.children || []) {
          out.push({ from: g.grupo, to: u.categoria || u.unidade || '—', value: u.total || 0 });
        }
      }
      setRows(out);
    })();
    return () => {
      active = false;
    };
  }, [filters.start, filters.end]);

  // Simplified sankey rendering (horizontal bands)
  const total = rows.reduce((a, b) => a + b.value, 0) || 1;
  const groups = Array.from(new Set(rows.map(r => r.from)));
  const cats = Array.from(new Set(rows.map(r => r.to)));
  const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo Grupo → Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <div className="relative" style={{ height: Math.max(groups.length, cats.length) * 32 + 40 }}>
            {/* Left labels (groups) */}
            <div className="absolute left-0 top-0">
              {groups.map((g, i) => (
                <div key={g} className="h-8 leading-8 text-sm">{g}</div>
              ))}
            </div>
            {/* Right labels (categories) */}
            <div className="absolute right-0 top-0 text-right">
              {cats.map((c, i) => (
                <div key={c} className="h-8 leading-8 text-sm">{c}</div>
              ))}
            </div>
            {/* Flows */}
            <svg width="100%" height={Math.max(groups.length, cats.length) * 32 + 40}>
              {rows.map((r, idx) => {
                const y1 = groups.indexOf(r.from) * 32 + 12;
                const y2 = cats.indexOf(r.to) * 32 + 12;
                const w = Math.max(2, (r.value / total) * 200);
                const x1 = 120, x2 = 600;
                const c = colors[idx % colors.length];
                const path = `M ${x1},${y1} C ${x1 + 120},${y1} ${x2 - 120},${y2} ${x2},${y2}`;
                return (
                  <g key={idx}>
                    <path d={path} stroke={c} strokeWidth={w} fill="none" opacity={0.35} />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


