
-- 1) Teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  number int NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage teams" ON public.teams
  FOR ALL USING (public.is_teacher_or_admin(auth.uid()))
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

-- Students see teams of classes they belong to (needed for signup-time list and UI)
CREATE POLICY "Students see teams of own classes" ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.class_enrollments ce
            WHERE ce.class_id = teams.class_id AND ce.user_id = auth.uid())
  );

CREATE INDEX idx_teams_class ON public.teams(class_id);

-- 2) Add team_id to enrollments and invitations
ALTER TABLE public.class_enrollments
  ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX idx_enrollments_team ON public.class_enrollments(team_id);

ALTER TABLE public.student_invitations
  ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 3) Helpers
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ce.team_id
  FROM public.class_enrollments ce
  JOIN public.classes c ON c.id = ce.class_id
  WHERE ce.user_id = _user_id
    AND c.status = 'active'
    AND ce.team_id IS NOT NULL
  ORDER BY ce.enrolled_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_same_active_team(_user_a uuid, _user_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_enrollments a
    JOIN public.class_enrollments b
      ON a.team_id = b.team_id AND a.class_id = b.class_id
    JOIN public.classes c ON c.id = a.class_id
    WHERE a.user_id = _user_a
      AND b.user_id = _user_b
      AND a.team_id IS NOT NULL
      AND c.status = 'active'
      AND _user_a <> _user_b
  )
$$;

CREATE OR REPLACE FUNCTION public.set_team_count(_class_id uuid, _count int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_max int;
  i int;
  to_remove RECORD;
BEGIN
  IF NOT public.is_teacher_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas professores podem alterar equipes';
  END IF;
  IF _count < 0 OR _count > 200 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  SELECT COALESCE(MAX(number), 0) INTO current_max FROM public.teams WHERE class_id = _class_id;

  -- Add missing
  IF _count > current_max THEN
    FOR i IN (current_max + 1).._count LOOP
      INSERT INTO public.teams (class_id, number, name)
      VALUES (_class_id, i, 'Equipe ' || i)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Remove extras (only if empty)
  IF _count < current_max THEN
    FOR to_remove IN
      SELECT id, number FROM public.teams
      WHERE class_id = _class_id AND number > _count
      ORDER BY number DESC
    LOOP
      IF EXISTS (SELECT 1 FROM public.class_enrollments WHERE team_id = to_remove.id) THEN
        RAISE EXCEPTION 'Equipe % possui alunos. Realoque-os antes de reduzir o número de equipes.', to_remove.number;
      END IF;
      DELETE FROM public.teams WHERE id = to_remove.id;
    END LOOP;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.move_student_to_team(_user_id uuid, _team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _class uuid;
BEGIN
  IF NOT public.is_teacher_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas professores podem realocar alunos';
  END IF;
  IF _team_id IS NULL THEN
    UPDATE public.class_enrollments SET team_id = NULL WHERE user_id = _user_id;
    RETURN;
  END IF;
  SELECT class_id INTO _class FROM public.teams WHERE id = _team_id;
  IF _class IS NULL THEN RAISE EXCEPTION 'Equipe inexistente'; END IF;
  UPDATE public.class_enrollments
    SET team_id = _team_id
    WHERE user_id = _user_id AND class_id = _class;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não está matriculado nesta turma';
  END IF;
END; $$;

-- 4) Update handle_new_user to consume team selection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _invitation RECORD;
  _final_role app_role;
  _team_id uuid;
  _meta_team_raw text;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email), NEW.email);

  SELECT * INTO _invitation FROM public.student_invitations
    WHERE lower(email) = lower(NEW.email) AND status = 'pending' LIMIT 1;

  _meta_team_raw := NEW.raw_user_meta_data ->> 'team_id';

  IF _invitation.id IS NOT NULL THEN
    _final_role := 'student';

    -- Prefer invitation team_id, fallback to user-chosen team from metadata
    IF _invitation.team_id IS NOT NULL THEN
      _team_id := _invitation.team_id;
    ELSIF _meta_team_raw IS NOT NULL AND _meta_team_raw <> '' THEN
      -- validate that team belongs to invitation class
      SELECT id INTO _team_id FROM public.teams
        WHERE id = _meta_team_raw::uuid AND class_id = _invitation.class_id;
    END IF;

    INSERT INTO public.class_enrollments (class_id, user_id, team_id)
    VALUES (_invitation.class_id, NEW.id, _team_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.student_invitations
      SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;
  ELSE
    _final_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _final_role);
  RETURN NEW;
END; $$;

-- 5) Team-mate access policies for matrices and concepts
CREATE POLICY "Teammates view matrices" ON public.matrices
  FOR SELECT USING (public.is_same_active_team(auth.uid(), user_id));

CREATE POLICY "Teammates update matrices" ON public.matrices
  FOR UPDATE USING (
    public.is_same_active_team(auth.uid(), user_id)
    AND NOT public.has_role(auth.uid(), 'viewer')
  );

CREATE POLICY "Teammates delete matrices" ON public.matrices
  FOR DELETE USING (
    public.is_same_active_team(auth.uid(), user_id)
    AND NOT public.has_role(auth.uid(), 'viewer')
  );

CREATE POLICY "Teammates view concepts" ON public.concepts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.matrices m
            WHERE m.id = concepts.matrix_id
              AND public.is_same_active_team(auth.uid(), m.user_id))
  );

CREATE POLICY "Teammates manage concepts" ON public.concepts
  FOR INSERT WITH CHECK (
    NOT public.has_role(auth.uid(), 'viewer')
    AND EXISTS (SELECT 1 FROM public.matrices m
                WHERE m.id = concepts.matrix_id
                  AND public.is_same_active_team(auth.uid(), m.user_id))
  );

CREATE POLICY "Teammates update concepts" ON public.concepts
  FOR UPDATE USING (
    NOT public.has_role(auth.uid(), 'viewer')
    AND EXISTS (SELECT 1 FROM public.matrices m
                WHERE m.id = concepts.matrix_id
                  AND public.is_same_active_team(auth.uid(), m.user_id))
  );

CREATE POLICY "Teammates delete concepts" ON public.concepts
  FOR DELETE USING (
    NOT public.has_role(auth.uid(), 'viewer')
    AND EXISTS (SELECT 1 FROM public.matrices m
                WHERE m.id = concepts.matrix_id
                  AND public.is_same_active_team(auth.uid(), m.user_id))
  );

-- Allow students to see basic info about teammates (needed for "matriz de X" labels)
CREATE POLICY "Teammates see each other profiles" ON public.profiles
  FOR SELECT USING (public.is_same_active_team(auth.uid(), id));
