import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface DashboardData {
  movimentos: any[];
  totalDespesas: number;
  totalReceitas: number;
  totalMovimentos: number;
  saldoMes: number;
  variacaoDespesas: number;
  variacaoReceitas: number;
  topCategorias: [string, { total: number; count: number }][];
  dataInicio: string;
  dataFim: string;
}

export function useDashboardRefresh(initialData: DashboardData) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // Atualizar dados iniciais quando initialData mudar
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refreshData = useCallback(async (showToast = true) => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Adicionar cache busting para garantir dados frescos
        cache: 'no-cache',
        // Adicionar timestamp para evitar cache
        next: { revalidate: 0 },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newData = await response.json();
      setData(newData);
      setLastUpdate(new Date(newData.lastUpdate || new Date()));

      if (showToast) {
        toast.success('Dashboard atualizada!');
      }
    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);

      if (showToast) {
        toast.error('Erro ao atualizar dashboard');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Atualização automática a cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData(false); // Não mostrar toast para atualizações automáticas
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshData]);

  // Atualização quando a janela ganha foco
  useEffect(() => {
    const handleFocus = () => {
      refreshData(false);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshData]);

  // Atualização quando o usuário volta para a aba
  useEffect(() => {
    const handlePageShow = () => {
      refreshData(false);
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [refreshData]);

  return {
    data,
    isRefreshing,
    lastUpdate,
    error,
    refreshData,
  };
}
