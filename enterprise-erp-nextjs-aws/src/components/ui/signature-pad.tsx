'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
}

export function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    // Configurar canvas com tamanho maior e melhor qualidade
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || canvas.offsetWidth || 800;
      const height = Math.max(rect.height || canvas.offsetHeight || 500, 500); // Altura mínima de 500px

      // Definir tamanho CSS primeiro
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      // Depois definir tamanho interno (em pixels físicos)
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // Escalar o contexto para compensar o DPR
      ctx.scale(dpr, dpr);

      // Configurar estilo de desenho melhorado
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';
      ctx.lineWidth = 3; // Linha em unidades CSS (já escalado pelo ctx.scale)
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';

      // Melhorar qualidade do desenho
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    // Como o contexto foi escalado com ctx.scale(dpr, dpr), as coordenadas do contexto
    // estão em unidades CSS, não em pixels físicos. Então precisamos apenas converter
    // as coordenadas do evento para coordenadas relativas ao canvas CSS.
    let clientX: number;
    let clientY: number;

    // Verificar se é um evento de toque
    if ('touches' in e || 'changedTouches' in e) {
      const touchEvent = e as React.TouchEvent<HTMLCanvasElement>;
      const touch = touchEvent.touches?.[0] || touchEvent.changedTouches?.[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // É um evento de mouse
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    // Calcular coordenadas relativas ao canvas em unidades CSS
    // Como o contexto está escalado, essas coordenadas já estão corretas
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    return { x, y };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const { x, y } = coords;
    ctx.beginPath();
    ctx.moveTo(x, y);
    lastPointRef.current = { x, y };
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const { x, y } = coords;
    const lastPoint = lastPointRef.current;

    if (lastPoint) {
      // Desenhar linha suave entre pontos com interpolação para melhor precisão
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Se a distância for muito grande, interpolar pontos intermediários
      if (distance > 5) {
        const steps = Math.ceil(distance / 2);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const interpX = lastPoint.x + dx * t;
          const interpY = lastPoint.y + dy * t;
          
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(interpX, interpY);
          ctx.stroke();
          
          lastPointRef.current = { x: interpX, y: interpY };
        }
      } else {
        // Desenhar linha direta para movimentos pequenos
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastPointRef.current = { x, y };
      }
    } else {
      // Primeiro ponto - desenhar um pequeno círculo
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      lastPointRef.current = { x, y };
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    lastPointRef.current = null;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative overflow-hidden shadow-sm">
        <canvas
          ref={canvasRef}
          className="w-full h-[500px] md:h-[400px] cursor-crosshair touch-none"
          style={{
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            display: 'block',
            WebkitTouchCallout: 'none',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-gray-50/50">
            <div className="text-center">
              <p className="text-base font-medium text-muted-foreground mb-1">
                Assine aqui
              </p>
              <p className="text-sm text-muted-foreground">
                Use o dedo para desenhar sua assinatura
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          disabled={!hasSignature}
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasSignature}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Salvar Assinatura
        </Button>
      </div>
      {!hasSignature && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Dica: Toque e arraste suavemente na tela acima para assinar
        </p>
      )}
    </div>
  );
}
