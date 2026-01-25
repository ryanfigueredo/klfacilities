'use client';

import React, { useEffect, useState } from 'react';

interface BrasilMapProps {
  estadosAtuacao: string[];
}

// Coordenadas aproximadas dos estados no SVG (x, y) - ajustadas para viewBox padrão do Brasil
// Essas coordenadas podem precisar de ajuste fino baseado no SVG real
const estadoCoords: Record<string, { x: number; y: number; nome: string }> = {
  AC: { x: 80, y: 220, nome: 'Acre' },
  AL: { x: 360, y: 290, nome: 'Alagoas' },
  AP: { x: 220, y: 60, nome: 'Amapá' },
  AM: { x: 120, y: 120, nome: 'Amazonas' },
  BA: { x: 320, y: 260, nome: 'Bahia' },
  CE: { x: 340, y: 190, nome: 'Ceará' },
  DF: { x: 260, y: 290, nome: 'Distrito Federal' },
  ES: { x: 330, y: 330, nome: 'Espírito Santo' },
  GO: { x: 260, y: 290, nome: 'Goiás' },
  MA: { x: 290, y: 160, nome: 'Maranhão' },
  MT: { x: 210, y: 260, nome: 'Mato Grosso' },
  MS: { x: 230, y: 330, nome: 'Mato Grosso do Sul' },
  MG: { x: 310, y: 310, nome: 'Minas Gerais' },
  PA: { x: 200, y: 130, nome: 'Pará' },
  PB: { x: 350, y: 230, nome: 'Paraíba' },
  PR: { x: 290, y: 390, nome: 'Paraná' },
  PE: { x: 340, y: 250, nome: 'Pernambuco' },
  PI: { x: 300, y: 210, nome: 'Piauí' },
  RJ: { x: 330, y: 350, nome: 'Rio de Janeiro' },
  RN: { x: 350, y: 210, nome: 'Rio Grande do Norte' },
  RS: { x: 290, y: 430, nome: 'Rio Grande do Sul' },
  RO: { x: 140, y: 190, nome: 'Rondônia' },
  RR: { x: 130, y: 60, nome: 'Roraima' },
  SC: { x: 290, y: 410, nome: 'Santa Catarina' },
  SP: { x: 310, y: 370, nome: 'São Paulo' },
  SE: { x: 350, y: 270, nome: 'Sergipe' },
  TO: { x: 250, y: 210, nome: 'Tocantins' },
};

function getEstadoNome(sigla: string): string {
  return estadoCoords[sigla]?.nome || sigla;
}

export function BrasilMap({ estadosAtuacao }: BrasilMapProps) {
  const useS3 = process.env.NEXT_PUBLIC_USE_S3_ASSETS === 'true';
  const usePublicBucket = process.env.NEXT_PUBLIC_S3_PUBLIC_BUCKET === 'true';
  
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSvg = async () => {
      // URL direta do S3 (sempre usar, já que o bucket é público)
      const svgUrl = `https://kl-checklist.s3.us-east-1.amazonaws.com/assets/brazilLow.svg`;
      
      try {
        console.log('[BrasilMap] Buscando SVG do S3:', svgUrl);
        const res = await fetch(svgUrl);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ao buscar SVG`);
        }
        
        const svg = await res.text();
        if (!svg || svg.trim().length === 0) {
          throw new Error('SVG vazio recebido');
        }
        
        console.log('[BrasilMap] SVG carregado com sucesso, tamanho:', svg.length);
        setSvgContent(svg);
      } catch (error: any) {
        console.error('[BrasilMap] Erro ao carregar SVG:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSvg();
  }, []);

  if (loading || !svgContent) {
    return (
      <div className="w-full flex justify-center items-center h-96">
        <div className="animate-pulse text-slate-400">Carregando mapa...</div>
      </div>
    );
  }

  // Extrair o conteúdo do SVG e viewBox
  const svgMatch = svgContent.match(/<svg([^>]*)>([\s\S]*)<\/svg>/i);
  if (!svgMatch) {
    console.error('[BrasilMap] Erro ao fazer parse do SVG');
    return (
      <div className="w-full flex justify-center items-center h-96">
        <div className="text-red-500">Erro ao processar SVG</div>
      </div>
    );
  }

  const svgAttrs = svgMatch[1];
  const svgInner = svgMatch[2];
  
  // Extrair viewBox do SVG original ou usar padrão
  const viewBoxMatch = svgAttrs.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 400.1 503';

  console.log('[BrasilMap] SVG processado, viewBox:', viewBox, 'conteúdo interno tamanho:', svgInner.length);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl relative">
        <svg
          viewBox={viewBox}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Renderizar conteúdo original do SVG */}
          <g dangerouslySetInnerHTML={{ __html: svgInner }} />
          
          {/* Adicionar bolinhas com nomes dos estados */}
          {estadosAtuacao.map(estado => {
            const coords = estadoCoords[estado];
            if (!coords) return null;
            return (
              <g key={estado}>
                <circle 
                  cx={coords.x} 
                  cy={coords.y} 
                  r="6" 
                  fill="#009ee2" 
                  stroke="#fff" 
                  strokeWidth="2"
                />
                <text 
                  x={coords.x} 
                  y={coords.y - 10} 
                  textAnchor="middle" 
                  fontSize="10" 
                  fontWeight="600" 
                  fill="#006996"
                  className="pointer-events-none"
                >
                  {coords.nome}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
