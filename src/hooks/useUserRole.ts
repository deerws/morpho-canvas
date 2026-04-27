import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function useUserRole() {
  const { user } = useAuth();

  const query = useQuery({
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

  const role = query.data || 'student';

  return {
    role,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher' || role === 'admin',
    isStudent: role === 'student',
    isViewer: role === 'viewer',
    isReadOnly: role === 'viewer',
    canCreate: role !== 'viewer',
    isLoading: query.isLoading,
  };
}
