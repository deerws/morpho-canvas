import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type FunctionRow = Database['public']['Tables']['functions']['Row'];
type FunctionInsert = Database['public']['Tables']['functions']['Insert'];
type FunctionUpdate = Database['public']['Tables']['functions']['Update'];

export interface ProductFunction {
  id: string;
  name: string;
  description: string | null;
  category: 'Mecânica' | 'Elétrica' | 'Térmica' | 'Hidráulica' | 'Química' | 'Outra';
  color: string;
  createdBy: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapRowToFunction = (row: FunctionRow): ProductFunction => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category as ProductFunction['category'],
  color: row.color,
  createdBy: row.created_by,
  isPublic: row.is_public,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function useFunctions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['functions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('functions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapRowToFunction);
    },
    enabled: !!user,
  });

  const addFunction = useMutation({
    mutationFn: async (func: Omit<ProductFunction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const insert: FunctionInsert = {
        name: func.name,
        description: func.description,
        category: func.category,
        color: func.color,
        is_public: func.isPublic,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('functions')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;
      return mapRowToFunction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      toast.success('Função criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar função');
    },
  });

  const updateFunction = useMutation({
    mutationFn: async ({ id, ...func }: Partial<ProductFunction> & { id: string }) => {
      const update: FunctionUpdate = {};
      if (func.name !== undefined) update.name = func.name;
      if (func.description !== undefined) update.description = func.description;
      if (func.category !== undefined) update.category = func.category;
      if (func.color !== undefined) update.color = func.color;
      if (func.isPublic !== undefined) update.is_public = func.isPublic;

      const { data, error } = await supabase
        .from('functions')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToFunction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      toast.success('Função atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar função');
    },
  });

  const deleteFunction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('functions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      toast.success('Função excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir função');
    },
  });

  return {
    functions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addFunction: addFunction.mutate,
    updateFunction: updateFunction.mutate,
    deleteFunction: deleteFunction.mutate,
    isAdding: addFunction.isPending,
    isUpdating: updateFunction.isPending,
    isDeleting: deleteFunction.isPending,
  };
}
