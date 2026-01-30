import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface FunctionData {
  id: string;
  name: string;
  category: string;
}

interface PrincipleData {
  id: string;
  title: string;
  description: string;
  functionId: string;
  functionName: string;
}

export interface GeneratedConcept {
  id: string;
  name: string;
  description: string;
  reasoning: string;
  innovationScore: number;
  feasibilityScore: number;
  costEstimate: 'low' | 'medium' | 'high';
  advantages: string[];
  challenges: string[];
  generatedAt: string;
}

interface GenerateOptions {
  numConcepts: number;
  temperature: number;
  focus: 'innovation' | 'feasibility' | 'cost';
}

function generateSelectionsHash(selections: Record<string, string>): string {
  const sortedEntries = Object.entries(selections).sort((a, b) => a[0].localeCompare(b[0]));
  return btoa(JSON.stringify(sortedEntries));
}

export function useAIConceptGeneration() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const getCachedConcepts = async (
    selections: Record<string, string>,
    options: GenerateOptions
  ): Promise<GeneratedConcept[] | null> => {
    if (!user) return null;

    const hash = generateSelectionsHash(selections);

    const { data, error } = await supabase
      .from('ai_concept_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('selections_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;

    const cachedOptions = data.options as { temperature?: number; focus?: string };
    if (
      cachedOptions.temperature !== options.temperature ||
      cachedOptions.focus !== options.focus
    ) {
      return null;
    }

    return (data.concepts as unknown as GeneratedConcept[]) || null;
  };

  const saveCacheEntry = async (
    selections: Record<string, string>,
    concepts: GeneratedConcept[],
    options: GenerateOptions
  ) => {
    if (!user) return;

    const hash = generateSelectionsHash(selections);

    // Using any type assertion to avoid Supabase Json type issues
    const insertData = {
      user_id: user.id,
      selections_hash: hash,
      selections: JSON.parse(JSON.stringify(selections)),
      concepts: JSON.parse(JSON.stringify(concepts)),
      options: JSON.parse(JSON.stringify(options)),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    await supabase
      .from('ai_concept_cache')
      .upsert([insertData as any], {
        onConflict: 'user_id,selections_hash'
      });
  };

  const generateConcepts = async (
    functions: FunctionData[],
    principles: PrincipleData[],
    selections: Record<string, string>,
    options: GenerateOptions
  ) => {
    setIsGenerating(true);
    setError(null);
    setFromCache(false);

    try {
      // Check cache first
      const cached = await getCachedConcepts(selections, options);
      if (cached && cached.length > 0) {
        setGeneratedConcepts(cached);
        setFromCache(true);
        toast.success(`${cached.length} conceito(s) encontrado(s) no cache!`);
        return cached;
      }

      const { data, error: funcError } = await supabase.functions.invoke('generate-concepts', {
        body: {
          functions,
          principles,
          selections,
          options
        }
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedConcepts(data.concepts);
      
      // Save to cache
      await saveCacheEntry(selections, data.concepts, options);
      
      toast.success(`${data.concepts.length} conceito(s) gerado(s) com sucesso!`);
      return data.concepts;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar conceitos';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  const clearConcepts = () => {
    setGeneratedConcepts([]);
    setError(null);
    setFromCache(false);
  };

  return {
    isGenerating,
    generatedConcepts,
    error,
    fromCache,
    generateConcepts,
    clearConcepts
  };
}
