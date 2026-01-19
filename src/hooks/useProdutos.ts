import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProdutoSupabase {
  id: number;
  restaurante_id: string;
  nome: string;
  preco: string;
  created_at: string;
}

export interface ProdutoInput {
  nome: string;
  preco: number;
}

export const useProdutos = (restaurantId: string | null) => {
  const [produtos, setProdutos] = useState<ProdutoSupabase[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch products from Supabase
  const fetchProdutos = useCallback(async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Produtos')
        .select('*')
        .eq('restaurante_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProdutos(data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Add new product
  const addProduto = useCallback(async (produto: ProdutoInput): Promise<boolean> => {
    if (!restaurantId) return false;

    try {
      const { error } = await supabase
        .from('Produtos')
        .insert({
          restaurante_id: restaurantId,
          nome: produto.nome,
          preco: produto.preco.toString(),
        });

      if (error) {
        console.error('Error adding product:', error);
        return false;
      }

      await fetchProdutos();
      return true;
    } catch (err) {
      console.error('Failed to add product:', err);
      return false;
    }
  }, [restaurantId, fetchProdutos]);

  // Update existing product
  const updateProduto = useCallback(async (id: number, updates: Partial<ProdutoInput>): Promise<boolean> => {
    if (!restaurantId) return false;

    try {
      const updateData: { nome?: string; preco?: string } = {};
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.preco !== undefined) updateData.preco = updates.preco.toString();

      const { error } = await supabase
        .from('Produtos')
        .update(updateData)
        .eq('id', id)
        .eq('restaurante_id', restaurantId);

      if (error) {
        console.error('Error updating product:', error);
        return false;
      }

      await fetchProdutos();
      return true;
    } catch (err) {
      console.error('Failed to update product:', err);
      return false;
    }
  }, [restaurantId, fetchProdutos]);

  // Delete product
  const deleteProduto = useCallback(async (id: number): Promise<boolean> => {
    if (!restaurantId) return false;

    try {
      const { error } = await supabase
        .from('Produtos')
        .delete()
        .eq('id', id)
        .eq('restaurante_id', restaurantId);

      if (error) {
        console.error('Error deleting product:', error);
        return false;
      }

      await fetchProdutos();
      return true;
    } catch (err) {
      console.error('Failed to delete product:', err);
      return false;
    }
  }, [restaurantId, fetchProdutos]);

  // Fetch products when restaurantId changes
  useEffect(() => {
    if (restaurantId) {
      fetchProdutos();
    }
  }, [restaurantId, fetchProdutos]);

  // Setup real-time subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('produtos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Produtos',
          filter: `restaurante_id=eq.${restaurantId}`,
        },
        () => {
          fetchProdutos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchProdutos]);

  return {
    produtos,
    loading,
    addProduto,
    updateProduto,
    deleteProduto,
    refetch: fetchProdutos,
  };
};
