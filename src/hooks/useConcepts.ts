import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type ConceptRow = Database['public']['Tables']['concepts']['Row'];
type ConceptInsert = Database['public']['Tables']['concepts']['Insert'];
type ConceptUpdate = Database['public']['Tables']['concepts']['Update'];

export interface Concept {
  id: string;
  name: string;
  matrixId: string;
  selections: Record<string, string>;
  description: string | null;
  generatedBy: 'manual' | 'ia';
  createdAt: string;
}

const mapRowToConcept = (row: ConceptRow): Concept => ({
  id: row.id,
  name: row.name,
  matrixId: row.matrix_id,
  selections: (row.selections as Record<string, string>) || {},
  description: row.description,
  generatedBy: row.generated_by as Concept['generatedBy'],
  createdAt: row.created_at,
});

export function useConcepts(matrixId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['concepts', matrixId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('concepts')
        .select('*')
        .order('created_at', { ascending: false });

      if (matrixId) {
        queryBuilder = queryBuilder.eq('matrix_id', matrixId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return (data || []).map(mapRowToConcept);
    },
    enabled: !!user,
  });

  const addConcept = useMutation({
    mutationFn: async (concept: Omit<Concept, 'id' | 'createdAt'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const insert: ConceptInsert = {
        name: concept.name,
        matrix_id: concept.matrixId,
        selections: concept.selections,
        description: concept.description,
        generated_by: concept.generatedBy,
      };

      const { data, error } = await supabase
        .from('concepts')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;
      return mapRowToConcept(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      toast.success('Conceito salvo com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar conceito');
    },
  });

  const updateConcept = useMutation({
    mutationFn: async ({ id, ...concept }: Partial<Concept> & { id: string }) => {
      const update: ConceptUpdate = {};
      if (concept.name !== undefined) update.name = concept.name;
      if (concept.selections !== undefined) update.selections = concept.selections;
      if (concept.description !== undefined) update.description = concept.description;
      if (concept.generatedBy !== undefined) update.generated_by = concept.generatedBy;

      const { data, error } = await supabase
        .from('concepts')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToConcept(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      toast.success('Conceito atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar conceito');
    },
  });

  const deleteConcept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('concepts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      toast.success('Conceito excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir conceito');
    },
  });

  return {
    concepts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addConcept: addConcept.mutate,
    updateConcept: updateConcept.mutate,
    deleteConcept: deleteConcept.mutate,
    isAdding: addConcept.isPending,
    isUpdating: updateConcept.isPending,
    isDeleting: deleteConcept.isPending,
  };
}
