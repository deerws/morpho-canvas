
-- Tabela classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  semester TEXT NOT NULL,
  teacher_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Matrículas
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, user_id)
);
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.class_enrollments(class_id);

-- Convites
CREATE TABLE IF NOT EXISTS public.student_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (email, class_id)
);
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.student_invitations(lower(email));

-- Snapshot em conceitos
ALTER TABLE public.concepts
  ADD COLUMN IF NOT EXISTS selections_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Helper
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('teacher','admin'))
$$;

-- Encerrar turma
CREATE OR REPLACE FUNCTION public.close_class(_class_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_teacher_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas professores podem encerrar turmas';
  END IF;
  UPDATE public.classes SET status = 'closed', closed_at = now() WHERE id = _class_id;
  UPDATE public.user_roles SET role = 'viewer'
    WHERE role = 'student' AND user_id IN (
      SELECT ce.user_id FROM public.class_enrollments ce
      WHERE ce.class_id = _class_id
      AND NOT EXISTS (
        SELECT 1 FROM public.class_enrollments ce2
        JOIN public.classes c2 ON c2.id = ce2.class_id
        WHERE ce2.user_id = ce.user_id AND ce2.class_id <> _class_id AND c2.status = 'active'
      )
    );
END; $$;

-- Reabrir turma
CREATE OR REPLACE FUNCTION public.reopen_class(_class_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_teacher_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas professores podem reabrir turmas';
  END IF;
  UPDATE public.classes SET status = 'active', closed_at = NULL WHERE id = _class_id;
  UPDATE public.user_roles SET role = 'student'
    WHERE role = 'viewer' AND user_id IN (
      SELECT user_id FROM public.class_enrollments WHERE class_id = _class_id
    );
END; $$;

-- Promover/rebaixar aluno manualmente
CREATE OR REPLACE FUNCTION public.set_student_role(_user_id UUID, _new_role app_role)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_teacher_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas professores podem alterar papel de alunos';
  END IF;
  IF _new_role NOT IN ('student','viewer') THEN
    RAISE EXCEPTION 'Apenas student ou viewer permitido';
  END IF;
  UPDATE public.user_roles SET role = _new_role WHERE user_id = _user_id;
END; $$;

-- Promover a professor (admin only)
CREATE OR REPLACE FUNCTION public.promote_to_teacher(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem promover professores';
  END IF;
  UPDATE public.user_roles SET role = 'teacher' WHERE user_id = _user_id;
END; $$;

-- Atualizar handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _invitation RECORD;
  _final_role app_role;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email), NEW.email);

  SELECT * INTO _invitation FROM public.student_invitations
    WHERE lower(email) = lower(NEW.email) AND status = 'pending' LIMIT 1;

  IF _invitation.id IS NOT NULL THEN
    _final_role := 'student';
    INSERT INTO public.class_enrollments (class_id, user_id)
    VALUES (_invitation.class_id, NEW.id) ON CONFLICT DO NOTHING;
    UPDATE public.student_invitations
      SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;
  ELSE
    _final_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _final_role);
  RETURN NEW;
END; $$;

-- RLS classes
CREATE POLICY "Teachers and admins manage classes" ON public.classes FOR ALL
  USING (public.is_teacher_or_admin(auth.uid()))
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));
CREATE POLICY "Students view their classes" ON public.classes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.class_enrollments WHERE class_id = classes.id AND user_id = auth.uid()));

-- RLS enrollments
CREATE POLICY "Teachers manage enrollments" ON public.class_enrollments FOR ALL
  USING (public.is_teacher_or_admin(auth.uid()))
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));
CREATE POLICY "Users see own enrollments" ON public.class_enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- RLS invitations
CREATE POLICY "Teachers manage invitations" ON public.student_invitations FOR ALL
  USING (public.is_teacher_or_admin(auth.uid()))
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

-- RLS functions
DROP POLICY IF EXISTS "Users can create functions" ON public.functions;
CREATE POLICY "Non-viewers create functions" ON public.functions FOR INSERT
  WITH CHECK (auth.uid() = created_by AND NOT public.has_role(auth.uid(), 'viewer'));
DROP POLICY IF EXISTS "Users can update functions" ON public.functions;
CREATE POLICY "Owners or teachers update functions" ON public.functions FOR UPDATE
  USING ((auth.uid() = created_by AND NOT public.has_role(auth.uid(), 'viewer'))
         OR public.is_teacher_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can delete functions" ON public.functions;
CREATE POLICY "Owners or teachers delete functions" ON public.functions FOR DELETE
  USING ((auth.uid() = created_by AND NOT public.has_role(auth.uid(), 'viewer'))
         OR public.is_teacher_or_admin(auth.uid()));

-- RLS principles
DROP POLICY IF EXISTS "Users can create principles" ON public.principles;
CREATE POLICY "Non-viewers create principles" ON public.principles FOR INSERT
  WITH CHECK (auth.uid() = created_by AND NOT public.has_role(auth.uid(), 'viewer'));
DROP POLICY IF EXISTS "Users can update principles" ON public.principles;
CREATE POLICY "Owners or teachers update principles" ON public.principles FOR UPDATE
  USING ((auth.uid() = created_by AND NOT public.has_role(auth.uid(), 'viewer'))
         OR public.is_teacher_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can delete principles" ON public.principles;
CREATE POLICY "Owners or teachers delete principles" ON public.principles FOR DELETE
  USING ((auth.uid() = created_by AND NOT public.has_role(auth.uid(), 'viewer'))
         OR public.is_teacher_or_admin(auth.uid()));

-- RLS matrices
DROP POLICY IF EXISTS "Users can create matrices" ON public.matrices;
CREATE POLICY "Non-viewers create matrices" ON public.matrices FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT public.has_role(auth.uid(), 'viewer'));
DROP POLICY IF EXISTS "Users can update their own matrices" ON public.matrices;
CREATE POLICY "Owners or teachers update matrices" ON public.matrices FOR UPDATE
  USING ((auth.uid() = user_id AND NOT public.has_role(auth.uid(), 'viewer'))
         OR public.is_teacher_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can delete their own matrices" ON public.matrices;
CREATE POLICY "Owners or teachers delete matrices" ON public.matrices FOR DELETE
  USING ((auth.uid() = user_id AND NOT public.has_role(auth.uid(), 'viewer'))
         OR public.is_teacher_or_admin(auth.uid()));
CREATE POLICY "Teachers view all matrices" ON public.matrices FOR SELECT
  USING (public.is_teacher_or_admin(auth.uid()));

-- RLS concepts
DROP POLICY IF EXISTS "Users can create concepts for their matrices" ON public.concepts;
CREATE POLICY "Non-viewers create concepts" ON public.concepts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.matrices WHERE matrices.id = concepts.matrix_id AND matrices.user_id = auth.uid())
    AND NOT public.has_role(auth.uid(), 'viewer'));
DROP POLICY IF EXISTS "Users can update concepts of their matrices" ON public.concepts;
CREATE POLICY "Owners or teachers update concepts" ON public.concepts FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM public.matrices WHERE matrices.id = concepts.matrix_id AND matrices.user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'viewer'))
    OR public.is_teacher_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can delete concepts of their matrices" ON public.concepts;
CREATE POLICY "Owners or teachers delete concepts" ON public.concepts FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM public.matrices WHERE matrices.id = concepts.matrix_id AND matrices.user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'viewer'))
    OR public.is_teacher_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can view concepts of their matrices" ON public.concepts;
CREATE POLICY "Owners or teachers view concepts" ON public.concepts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.matrices WHERE matrices.id = concepts.matrix_id AND matrices.user_id = auth.uid())
    OR public.is_teacher_or_admin(auth.uid()));
