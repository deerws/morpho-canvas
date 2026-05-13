DROP POLICY IF EXISTS "Non-viewers create concepts" ON public.concepts;
CREATE POLICY "Non-viewers create concepts" ON public.concepts
FOR INSERT
WITH CHECK (
  (NOT has_role(auth.uid(), 'viewer'::app_role))
  AND (
    EXISTS (SELECT 1 FROM matrices WHERE matrices.id = concepts.matrix_id AND matrices.user_id = auth.uid())
    OR is_teacher_or_admin(auth.uid())
  )
);