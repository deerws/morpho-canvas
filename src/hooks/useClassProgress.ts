import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentProgress {
  userId: string;
  name: string;
  email: string;
  teamId: string | null;
  teamName: string | null;
  teamNumber: number | null;
  matricesCount: number;
  conceptsCount: number;
  lastActivity: string | null;
}

export function useClassProgress(classId: string | null) {
  return useQuery({
    queryKey: ['class-progress', classId],
    queryFn: async (): Promise<StudentProgress[]> => {
      if (!classId) return [];

      const { data: enrolls } = await supabase
        .from('class_enrollments')
        .select('user_id, team_id')
        .eq('class_id', classId);

      const userIds = (enrolls || []).map((e) => e.user_id);
      if (!userIds.length) return [];

      const [{ data: profiles }, { data: teams }, { data: matrices }] = await Promise.all([
        supabase.from('profiles').select('id, name, email').in('id', userIds),
        supabase.from('teams').select('id, name, number').eq('class_id', classId),
        supabase.from('matrices').select('id, user_id, updated_at').in('user_id', userIds),
      ]);

      const matrixIds = (matrices || []).map((m) => m.id);
      let concepts: Array<{ matrix_id: string; created_at: string }> = [];
      if (matrixIds.length) {
        const { data: c } = await supabase
          .from('concepts')
          .select('matrix_id, created_at')
          .in('matrix_id', matrixIds);
        concepts = c || [];
      }

      const conceptByMatrix: Record<string, { count: number; last: string | null }> = {};
      for (const c of concepts) {
        const slot = conceptByMatrix[c.matrix_id] || { count: 0, last: null };
        slot.count += 1;
        if (!slot.last || slot.last < c.created_at) slot.last = c.created_at;
        conceptByMatrix[c.matrix_id] = slot;
      }

      return (enrolls || []).map((e) => {
        const p = profiles?.find((x) => x.id === e.user_id);
        const t = teams?.find((x) => x.id === e.team_id);
        const userMatrices = (matrices || []).filter((m) => m.user_id === e.user_id);
        const cCount = userMatrices.reduce((acc, m) => acc + (conceptByMatrix[m.id]?.count || 0), 0);
        const lastMatrix = userMatrices.reduce<string | null>(
          (acc, m) => (!acc || acc < m.updated_at ? m.updated_at : acc),
          null,
        );
        const lastConcept = userMatrices.reduce<string | null>(
          (acc, m) => {
            const l = conceptByMatrix[m.id]?.last || null;
            return !acc || (l && acc < l) ? l : acc;
          },
          null,
        );
        const lastActivity = [lastMatrix, lastConcept].filter(Boolean).sort().slice(-1)[0] || null;
        return {
          userId: e.user_id,
          name: p?.name || p?.email || '—',
          email: p?.email || '',
          teamId: e.team_id,
          teamName: t?.name || null,
          teamNumber: t?.number || null,
          matricesCount: userMatrices.length,
          conceptsCount: cCount,
          lastActivity,
        };
      });
    },
    enabled: !!classId,
  });
}
