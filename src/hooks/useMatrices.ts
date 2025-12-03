import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type MatrixRow = Database['public']['Tables']['matrices']['Row'];
type MatrixInsert = Database['public']['Tables']['matrices']['Insert'];
type MatrixUpdate = Database['public']['Tables']['matrices']['Update'];

export interface Matrix {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  functionIds: string[];
  createdAt: string;
  updatedAt: string;
}

const mapRowToMatrix = (row: MatrixRow): Matrix => ({
  id: row.id,
  name: row.name,
  description: row.description,
  userId: row.user_id,
  functionIds: row.function_ids || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function useMatrices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matrices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matrices')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapRowToMatrix);
    },
    enabled: !!user,
  });

  const addMatrix = useMutation({
    mutationFn: async (matrix: Omit<Matrix, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const insert: MatrixInsert = {
        name: matrix.name,
        description: matrix.description,
        function_ids: matrix.functionIds,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('matrices')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;
      return mapRowToMatrix(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrices'] });
      toast.success('Matriz criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar matriz');
    },
  });

  const updateMatrix = useMutation({
    mutationFn: async ({ id, ...matrix }: Partial<Matrix> & { id: string }) => {
      const update: MatrixUpdate = {};
      if (matrix.name !== undefined) update.name = matrix.name;
      if (matrix.description !== undefined) update.description = matrix.description;
      if (matrix.functionIds !== undefined) update.function_ids = matrix.functionIds;

      const { data, error } = await supabase
        .from('matrices')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToMatrix(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrices'] });
      toast.success('Matriz atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar matriz');
    },
  });

  const deleteMatrix = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('matrices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrices'] });
      toast.success('Matriz excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir matriz');
    },
  });

  return {
    matrices: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addMatrix: addMatrix.mutateAsync,
    updateMatrix: updateMatrix.mutate,
    deleteMatrix: deleteMatrix.mutate,
    isAdding: addMatrix.isPending,
    isUpdating: updateMatrix.isPending,
    isDeleting: deleteMatrix.isPending,
  };
}

export function useMatrix(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['matrix', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('matrices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data ? mapRowToMatrix(data) : null;
    },
    enabled: !!user && !!id,
  });
}
