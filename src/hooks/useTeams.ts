import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeamRow {
  id: string;
  class_id: string;
  number: number;
  name: string;
  memberCount: number;
}

export function useTeams(classId: string | null) {
  const qc = useQueryClient();

  const teams = useQuery({
    queryKey: ['teams', classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data: rows, error } = await supabase
        .from('teams')
        .select('*')
        .eq('class_id', classId)
        .order('number');
      if (error) throw error;
      const ids = (rows || []).map((r) => r.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: enrolls } = await supabase
          .from('class_enrollments')
          .select('team_id')
          .in('team_id', ids);
        for (const e of enrolls || []) {
          if (e.team_id) counts[e.team_id] = (counts[e.team_id] || 0) + 1;
        }
      }
      return (rows || []).map((r) => ({ ...r, memberCount: counts[r.id] || 0 })) as TeamRow[];
    },
    enabled: !!classId,
  });

  const setTeamCount = useMutation({
    mutationFn: async (params: { classId: string; count: number }) => {
      const { error } = await supabase.rpc('set_team_count', {
        _class_id: params.classId,
        _count: params.count,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Equipes atualizadas');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveStudent = useMutation({
    mutationFn: async (params: { userId: string; teamId: string | null }) => {
      const { error } = await supabase.rpc('move_student_to_team', {
        _user_id: params.userId,
        _team_id: params.teamId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Aluno realocado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    teams: teams.data || [],
    isLoading: teams.isLoading,
    setTeamCount: setTeamCount.mutate,
    moveStudent: moveStudent.mutate,
  };
}
