-- Create table for AI concept cache
CREATE TABLE public.ai_concept_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  selections_hash TEXT NOT NULL,
  selections JSONB NOT NULL DEFAULT '{}',
  concepts JSONB NOT NULL DEFAULT '[]',
  options JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(user_id, selections_hash)
);

-- Enable RLS
ALTER TABLE public.ai_concept_cache ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own cache" 
ON public.ai_concept_cache 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cache" 
ON public.ai_concept_cache 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache" 
ON public.ai_concept_cache 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache" 
ON public.ai_concept_cache 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_ai_concept_cache_hash ON public.ai_concept_cache (user_id, selections_hash);
CREATE INDEX idx_ai_concept_cache_expires ON public.ai_concept_cache (expires_at);