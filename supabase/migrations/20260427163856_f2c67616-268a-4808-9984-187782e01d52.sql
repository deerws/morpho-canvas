
REVOKE EXECUTE ON FUNCTION public.close_class(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reopen_class(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_student_role(UUID, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.promote_to_teacher(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_teacher_or_admin(UUID) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.close_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_student_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_teacher(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin(UUID) TO authenticated;
