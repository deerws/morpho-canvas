import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type PrincipleRow = Database['public']['Tables']['principles']['Row'];
type PrincipleInsert = Database['public']['Tables']['principles']['Insert'];
type PrincipleUpdate = Database['public']['Tables']['principles']['Update'];

export interface Principle {
  id: string;
  title: string;
  description: string;
  functionId: string;
  imageUrl: string | null;
  tags: string[];
  complexity: number;
  cost: 'Baixo' | 'Médio' | 'Alto';
  usageCount: number;
  createdBy: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapRowToPrinciple = (row: PrincipleRow): Principle => ({
  id: row.id,
  title: row.title,
  description: row.description,
  functionId: row.function_id,
  imageUrl: row.image_url,
  tags: row.tags || [],
  complexity: row.complexity,
  cost: row.cost as Principle['cost'],
  usageCount: row.usage_count,
  createdBy: row.created_by,
  isPublic: row.is_public,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function usePrinciples() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['principles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('principles')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapRowToPrinciple);
    },
    enabled: !!user,
  });

  const addPrinciple = useMutation({
    mutationFn: async (principle: Omit<Principle, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'usageCount'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const insert: PrincipleInsert = {
        title: principle.title,
        description: principle.description,
        function_id: principle.functionId,
        image_url: principle.imageUrl,
        tags: principle.tags,
        complexity: principle.complexity,
        cost: principle.cost,
        is_public: principle.isPublic,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('principles')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;
      return mapRowToPrinciple(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principles'] });
      toast.success('Princípio criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar princípio');
    },
  });

  const updatePrinciple = useMutation({
    mutationFn: async ({ id, ...principle }: Partial<Principle> & { id: string }) => {
      const update: PrincipleUpdate = {};
      if (principle.title !== undefined) update.title = principle.title;
      if (principle.description !== undefined) update.description = principle.description;
      if (principle.functionId !== undefined) update.function_id = principle.functionId;
      if (principle.imageUrl !== undefined) update.image_url = principle.imageUrl;
      if (principle.tags !== undefined) update.tags = principle.tags;
      if (principle.complexity !== undefined) update.complexity = principle.complexity;
      if (principle.cost !== undefined) update.cost = principle.cost;
      if (principle.isPublic !== undefined) update.is_public = principle.isPublic;

      const { data, error } = await supabase
        .from('principles')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToPrinciple(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principles'] });
      toast.success('Princípio atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar princípio');
    },
  });

  const deletePrinciple = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('principles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principles'] });
      toast.success('Princípio excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir princípio');
    },
  });

  const incrementUsage = useMutation({
    mutationFn: async (id: string) => {
      const { data: current, error: fetchError } = await supabase
        .from('principles')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('principles')
        .update({ usage_count: (current?.usage_count || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principles'] });
    },
  });

  return {
    principles: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addPrinciple: addPrinciple.mutate,
    updatePrinciple: updatePrinciple.mutate,
    deletePrinciple: deletePrinciple.mutate,
    incrementUsage: incrementUsage.mutate,
    isAdding: addPrinciple.isPending,
    isUpdating: updatePrinciple.isPending,
    isDeleting: deletePrinciple.isPending,
  };
}
