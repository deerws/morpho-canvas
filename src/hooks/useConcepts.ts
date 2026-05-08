import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type ConceptRow = Database['public']['Tables']['concepts']['Row'];
type ConceptInsert = Database['public']['Tables']['concepts']['Insert'];
type ConceptUpdate = Database['public']['Tables']['concepts']['Update'];

export interface SnapshotEntry {
  functionName: string;
  functionColor: string;
  principleId: string;
  principleTitle: string;
  principleDescription: string;
  principleImageUrl: string | null;
}

export type SelectionsSnapshot = Record<string, SnapshotEntry>;

export interface Concept {
  id: string;
  name: string;
  matrixId: string;
  selections: Record<string, string>;
  selectionsSnapshot: SelectionsSnapshot;
  description: string | null;
  generatedBy: 'manual' | 'ia';
  imageUrl: string | null;
  createdAt: string;
}

const mapRowToConcept = (row: ConceptRow): Concept => ({
  id: row.id,
  name: row.name,
  matrixId: row.matrix_id,
  selections: (row.selections as Record<string, string>) || {},
  selectionsSnapshot: (row.selections_snapshot as unknown as SelectionsSnapshot) || {},
  description: row.description,
  generatedBy: row.generated_by as Concept['generatedBy'],
  imageUrl: (row as unknown as { image_url: string | null }).image_url ?? null,
  createdAt: row.created_at,
});

/**
 * Builds a frozen snapshot of the referenced functions/principles.
 * Reads live data from Supabase so it works regardless of which page calls it.
 */
async function buildSelectionsSnapshot(
  selections: Record<string, string>
): Promise<SelectionsSnapshot> {
  const functionIds = Object.keys(selections);
  const principleIds = Object.values(selections).filter(Boolean);

  if (functionIds.length === 0) return {};

  const [functionsRes, principlesRes] = await Promise.all([
    supabase.from('functions').select('id, name, color').in('id', functionIds),
    principleIds.length > 0
      ? supabase
          .from('principles')
          .select('id, title, description, image_url')
          .in('id', principleIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  if (functionsRes.error) throw functionsRes.error;
  if (principlesRes.error) throw principlesRes.error;

  const fnMap = new Map<string, { id: string; name: string; color: string }>(
    (functionsRes.data || []).map((f) => [f.id, f] as const)
  );
  const prMap = new Map<
    string,
    { id: string; title: string; description: string; image_url: string | null }
  >((principlesRes.data || []).map((p) => [p.id, p] as const));

  const snapshot: SelectionsSnapshot = {};
  for (const [funcId, principleId] of Object.entries(selections)) {
    const f = fnMap.get(funcId);
    const p = prMap.get(principleId);
    snapshot[funcId] = {
      functionName: f?.name || '',
      functionColor: f?.color || '#6b7280',
      principleId: principleId || '',
      principleTitle: p?.title || '',
      principleDescription: p?.description || '',
      principleImageUrl: p?.image_url || null,
    };
  }
  return snapshot;
}

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
    mutationFn: async (concept: Omit<Concept, 'id' | 'createdAt' | 'selectionsSnapshot' | 'imageUrl'> & { imageUrl?: string | null }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const snapshot = await buildSelectionsSnapshot(concept.selections);

      const insert: ConceptInsert = {
        name: concept.name,
        matrix_id: concept.matrixId,
        selections: concept.selections,
        selections_snapshot: snapshot as unknown as ConceptInsert['selections_snapshot'],
        description: concept.description,
        generated_by: concept.generatedBy,
        ...(concept.imageUrl ? { image_url: concept.imageUrl } : {}),
      } as ConceptInsert;

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
      if (concept.selections !== undefined) {
        update.selections = concept.selections;
        // Rebuild snapshot whenever selections change to keep it frozen-but-current.
        const snap = await buildSelectionsSnapshot(concept.selections);
        update.selections_snapshot = snap as unknown as ConceptUpdate['selections_snapshot'];
      }
      if (concept.description !== undefined) update.description = concept.description;
      if (concept.generatedBy !== undefined) update.generated_by = concept.generatedBy;
      if (concept.imageUrl !== undefined) {
        (update as unknown as { image_url: string | null }).image_url = concept.imageUrl;
      }

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
