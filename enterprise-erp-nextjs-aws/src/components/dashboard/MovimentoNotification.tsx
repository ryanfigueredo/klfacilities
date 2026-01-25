'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';

interface MovimentoNotificationProps {
  lastMovimentoId?: string;
  onUpdate?: () => void;
}

export function MovimentoNotification({
  lastMovimentoId,
  onUpdate,
}: MovimentoNotificationProps) {
  const [lastKnownId, setLastKnownId] = useState(lastMovimentoId);
  const [isChecking, setIsChecking] = useState(false);

  // Verificar atualizações periodicamente
  useEffect(() => {
    const checkForUpdates = async () => {
      if (isChecking) return;

      setIsChecking(true);
      try {
        const response = await fetch('/api/dashboard', {
          cache: 'no-cache',
        });

        if (response.ok) {
          const data = await response.json();
          const currentLastId = data.movimentos?.[0]?.id;

          // Se há um novo movimento
          if (currentLastId && currentLastId !== lastKnownId && lastKnownId) {
            toast.success('Novo movimento detectado!', {
              description: 'A dashboard foi atualizada automaticamente.',
              icon: <Bell className="h-4 w-4" />,
              duration: 3000,
            });

            // Chamar callback de atualização
            onUpdate?.();
          }

          setLastKnownId(currentLastId);
        }
      } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Verificar a cada 10 segundos
    const interval = setInterval(checkForUpdates, 10000);

    return () => clearInterval(interval);
  }, [lastKnownId, isChecking, onUpdate]);

  return null; // Componente invisível
}
