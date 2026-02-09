
-- Update functions UPDATE policy: teachers/admins can update any, students only their own
DROP POLICY IF EXISTS "Users can update their own functions" ON public.functions;
CREATE POLICY "Users can update functions"
ON public.functions
FOR UPDATE
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
);

-- Update functions DELETE policy: teachers/admins can delete any, students only their own
DROP POLICY IF EXISTS "Users can delete their own functions" ON public.functions;
CREATE POLICY "Users can delete functions"
ON public.functions
FOR DELETE
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
);

-- Update principles UPDATE policy: teachers/admins can update any, students only their own
DROP POLICY IF EXISTS "Users can update their own principles" ON public.principles;
CREATE POLICY "Users can update principles"
ON public.principles
FOR UPDATE
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
);

-- Update principles DELETE policy: teachers/admins can delete any, students only their own
DROP POLICY IF EXISTS "Users can delete their own principles" ON public.principles;
CREATE POLICY "Users can delete principles"
ON public.principles
FOR DELETE
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
);
