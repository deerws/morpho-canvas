import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ClassRow {
  id: string;
  name: string;
  semester: string;
  teacher_id: string;
  status: 'active' | 'closed';
  created_at: string;
  closed_at: string | null;
}

export function useClasses() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['classes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ClassRow[];
    },
    enabled: !!user,
  });

  const createClass = useMutation({
    mutationFn: async (input: { name: string; semester: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: input.name, semester: input.semester, teacher_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Turma criada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeClass = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.rpc('close_class', { _class_id: classId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['user-role'] });
      toast.success('Turma encerrada. Alunos rebaixados a espectadores.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopenClass = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.rpc('reopen_class', { _class_id: classId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['user-role'] });
      toast.success('Turma reaberta');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClass = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Turma removida');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    classes: query.data || [],
    isLoading: query.isLoading,
    createClass: createClass.mutate,
    closeClass: closeClass.mutate,
    reopenClass: reopenClass.mutate,
    deleteClass: deleteClass.mutate,
  };
}
