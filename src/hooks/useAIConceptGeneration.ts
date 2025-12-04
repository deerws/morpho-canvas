import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function useAIConceptGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateConcepts = async (
    functions: FunctionData[],
    principles: PrincipleData[],
    selections: Record<string, string>,
    options: GenerateOptions
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
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
  };

  return {
    isGenerating,
    generatedConcepts,
    error,
    generateConcepts,
    clearConcepts
  };
}
