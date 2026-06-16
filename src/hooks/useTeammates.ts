import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';

export interface Teammate {
  userId: string;
  name: string;
  email: string;
}

export function useTeammates() {
  const { user } = useAuth();
  const { teamId } = useUserRole();

  const query = useQuery({
    queryKey: ['teammates', teamId, user?.id],
    queryFn: async (): Promise<Teammate[]> => {
      if (!teamId || !user) return [];
      const { data: rows } = await supabase
        .from('class_enrollments')
        .select('user_id')
        .eq('team_id', teamId);
      const ids = (rows || []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', ids);
      return (profs || []).map((p) => ({
        userId: p.id,
        name: p.name || p.email,
        email: p.email,
      }));
    },
    enabled: !!teamId && !!user,
  });

  const teammates = query.data || [];
  const teammateIds = new Set(teammates.map((t) => t.userId));

  return {
    teammates,
    teammateIds,
    isTeammate: (uid: string) => teammateIds.has(uid),
    nameOf: (uid: string) => teammates.find((t) => t.userId === uid)?.name || null,
  };
}
