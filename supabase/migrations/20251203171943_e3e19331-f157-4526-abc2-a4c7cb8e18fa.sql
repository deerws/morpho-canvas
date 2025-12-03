-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create function_category enum
CREATE TYPE public.function_category AS ENUM ('Mecânica', 'Elétrica', 'Térmica', 'Hidráulica', 'Química', 'Outra');

-- Create cost_level enum
CREATE TYPE public.cost_level AS ENUM ('Baixo', 'Médio', 'Alto');

-- Create concept_generated_by enum
CREATE TYPE public.concept_generated_by AS ENUM ('manual', 'ia');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

-- Create functions table (product functions)
CREATE TABLE public.functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category function_category NOT NULL DEFAULT 'Outra',
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create principles table
CREATE TABLE public.principles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  function_id UUID REFERENCES public.functions(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  complexity INTEGER NOT NULL DEFAULT 1 CHECK (complexity >= 1 AND complexity <= 5),
  cost cost_level NOT NULL DEFAULT 'Médio',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matrices table
CREATE TABLE public.matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  function_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create concepts table
CREATE TABLE public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  matrix_id UUID REFERENCES public.matrices(id) ON DELETE CASCADE NOT NULL,
  selections JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  generated_by concept_generated_by NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Functions policies
CREATE POLICY "Anyone can view public functions"
  ON public.functions FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create functions"
  ON public.functions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own functions"
  ON public.functions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own functions"
  ON public.functions FOR DELETE
  USING (auth.uid() = created_by);

-- Principles policies
CREATE POLICY "Anyone can view public principles"
  ON public.principles FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create principles"
  ON public.principles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own principles"
  ON public.principles FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own principles"
  ON public.principles FOR DELETE
  USING (auth.uid() = created_by);

-- Matrices policies
CREATE POLICY "Users can view their own matrices"
  ON public.matrices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create matrices"
  ON public.matrices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matrices"
  ON public.matrices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matrices"
  ON public.matrices FOR DELETE
  USING (auth.uid() = user_id);

-- Concepts policies
CREATE POLICY "Users can view concepts of their matrices"
  ON public.concepts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matrices
      WHERE matrices.id = concepts.matrix_id
      AND matrices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create concepts for their matrices"
  ON public.concepts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matrices
      WHERE matrices.id = matrix_id
      AND matrices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update concepts of their matrices"
  ON public.concepts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matrices
      WHERE matrices.id = concepts.matrix_id
      AND matrices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete concepts of their matrices"
  ON public.concepts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.matrices
      WHERE matrices.id = concepts.matrix_id
      AND matrices.user_id = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'));
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_functions_updated_at
  BEFORE UPDATE ON public.functions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_principles_updated_at
  BEFORE UPDATE ON public.principles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matrices_updated_at
  BEFORE UPDATE ON public.matrices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for principle images
INSERT INTO storage.buckets (id, name, public)
VALUES ('principle-images', 'principle-images', true);

-- Storage policies for principle images
CREATE POLICY "Anyone can view principle images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'principle-images');

CREATE POLICY "Authenticated users can upload principle images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'principle-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own principle images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'principle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own principle images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'principle-images' AND auth.uid()::text = (storage.foldername(name))[1]);