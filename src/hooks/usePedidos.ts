import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Pedido {
  id: number;
  mesa: string | null;
  itens: string | null;
  Subtotal: string | null;
  status: string | null;
  restaurante_id: string | null;
  created_at: string;
}

export interface ParsedPedido {
  id: number;
  mesa: number;
  itens: Array<{ nome: string; quantidade: number; preco: number }>;
  total: number;
  status: string;
  restaurante_id: string | null;
  created_at: Date;
}

const parsePedido = (pedido: Pedido): ParsedPedido => {
  let itens: Array<{ nome: string; quantidade: number; preco: number }> = [];
  try {
    if (pedido.itens) {
      itens = JSON.parse(pedido.itens);
    }
  } catch {
    itens = [];
  }

  return {
    id: pedido.id,
    mesa: parseInt(pedido.mesa || '0', 10),
    itens,
    total: parseFloat(pedido.Subtotal || '0'),
    status: pedido.status || 'pendente',
    restaurante_id: pedido.restaurante_id,
    created_at: new Date(pedido.created_at),
  };
};

export const usePedidos = (restaurantId: string | null) => {
  const [pedidos, setPedidos] = useState<ParsedPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidos = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('Pedidos')
        .select('*')
        .eq('restaurante_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPedidos((data || []).map(parsePedido));
    } catch (err) {
      console.error('Error fetching pedidos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!restaurantId) return;

    fetchPedidos();

    // Set up realtime subscription
    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Pedidos',
          filter: `restaurante_id=eq.${restaurantId}`,
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newPedido = parsePedido(payload.new as Pedido);
            setPedidos(prev => [newPedido, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedPedido = parsePedido(payload.new as Pedido);
            setPedidos(prev => 
              prev.map(p => p.id === updatedPedido.id ? updatedPedido : p)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Pedido).id;
            setPedidos(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchPedidos]);

  const updatePedidoStatus = useCallback(async (pedidoId: number, status: string) => {
    try {
      const { error } = await supabase
        .from('Pedidos')
        .update({ status })
        .eq('id', pedidoId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Error updating pedido:', err);
      return { error: err instanceof Error ? err.message : 'Erro ao atualizar pedido' };
    }
  }, []);

  const deletePedido = useCallback(async (pedidoId: number) => {
    try {
      const { error } = await supabase
        .from('Pedidos')
        .delete()
        .eq('id', pedidoId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Error deleting pedido:', err);
      return { error: err instanceof Error ? err.message : 'Erro ao excluir pedido' };
    }
  }, []);

  // Calculate daily metrics
  const dailyMetrics = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysPedidos = pedidos.filter(p => {
      const pedidoDate = new Date(p.created_at);
      pedidoDate.setHours(0, 0, 0, 0);
      return pedidoDate.getTime() === today.getTime();
    });

    const totalSales = todaysPedidos.reduce((sum, p) => sum + p.total, 0);
    const pendingOrders = pedidos.filter(p => p.status === 'pendente').length;

    // Product sales count
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    todaysPedidos.forEach(pedido => {
      pedido.itens.forEach(item => {
        const key = item.nome;
        if (!productSales[key]) {
          productSales[key] = { name: item.nome, quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += item.quantidade;
        productSales[key].revenue += item.preco * item.quantidade;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalSales,
      pendingOrders,
      topProducts,
      totalOrders: todaysPedidos.length,
    };
  }, [pedidos]);

  return {
    pedidos,
    loading,
    error,
    updatePedidoStatus,
    deletePedido,
    refetch: fetchPedidos,
    dailyMetrics,
  };
};
