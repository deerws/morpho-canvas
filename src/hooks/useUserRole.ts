import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function useUserRole() {
  const { user } = useAuth();

  const roleQuery = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as AppRole) || 'student';
    },
    enabled: !!user,
  });

  const teamQuery = useQuery({
    queryKey: ['user-team', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('team_id, class_id, classes!inner(status)')
        .eq('user_id', user!.id)
        .eq('classes.status', 'active')
        .not('team_id', 'is', null)
        .maybeSingle();
      if (error) return null;
      return data
        ? { teamId: data.team_id as string, classId: data.class_id as string }
        : null;
    },
    enabled: !!user,
  });

  const role = roleQuery.data || 'student';

  return {
    role,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher' || role === 'admin',
    isStudent: role === 'student',
    isViewer: role === 'viewer',
    isReadOnly: role === 'viewer',
    canCreate: role !== 'viewer',
    teamId: teamQuery.data?.teamId || null,
    classId: teamQuery.data?.classId || null,
    isLoading: roleQuery.isLoading,
  };
}
