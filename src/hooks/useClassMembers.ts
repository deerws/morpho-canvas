import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useClassMembers(classId: string | null) {
  const qc = useQueryClient();

  const enrollments = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data: rows, error } = await supabase
        .from('class_enrollments')
        .select('id, user_id, enrolled_at')
        .eq('class_id', classId);
      if (error) throw error;

      const userIds = (rows || []).map((r) => r.user_id);
      if (!userIds.length) return [];

      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('id, name, email').in('id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
      ]);

      return (rows || []).map((r) => {
        const p = profiles?.find((x) => x.id === r.user_id);
        const role = roles?.find((x) => x.user_id === r.user_id)?.role || 'student';
        return {
          enrollmentId: r.id,
          userId: r.user_id,
          name: p?.name || p?.email || '—',
          email: p?.email || '',
          role,
          enrolledAt: r.enrolled_at,
        };
      });
    },
    enabled: !!classId,
  });

  const invitations = useQuery({
    queryKey: ['invitations', classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
  });

  const addInvitations = useMutation({
    mutationFn: async (params: { emails: string[]; classId: string; invitedBy: string }) => {
      const rows = params.emails.map((email) => ({
        email: email.toLowerCase().trim(),
        class_id: params.classId,
        invited_by: params.invitedBy,
      }));
      const { error } = await supabase
        .from('student_invitations')
        .upsert(rows, { onConflict: 'email,class_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Convites adicionados');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('student_invitations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Convite removido');
    },
  });

  const removeMember = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.from('class_enrollments').delete().eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Aluno removido da turma');
    },
  });

  const setStudentRole = useMutation({
    mutationFn: async (params: { userId: string; role: 'student' | 'viewer' }) => {
      const { error } = await supabase.rpc('set_student_role', {
        _user_id: params.userId,
        _new_role: params.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Papel atualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    members: enrollments.data || [],
    invitations: invitations.data || [],
    isLoading: enrollments.isLoading || invitations.isLoading,
    addInvitations: addInvitations.mutate,
    removeInvitation: removeInvitation.mutate,
    removeMember: removeMember.mutate,
    setStudentRole: setStudentRole.mutate,
  };
}
