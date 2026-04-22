import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ImageStyle = 'realistic' | 'sketch' | 'render3d' | 'blueprint';

export function useConceptImage() {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<Record<string, string>>({});

  const isLoading = (conceptId: string) => loadingIds.has(conceptId);
  const getImage = (conceptId: string) => images[conceptId];

  const generateImage = async (
    conceptId: string,
    conceptName: string,
    conceptDescription: string,
    style: ImageStyle = 'render3d'
  ): Promise<string | null> => {
    setLoadingIds(prev => new Set(prev).add(conceptId));

    try {
      const { data, error } = await supabase.functions.invoke('generate-concept-image', {
        body: { conceptName, conceptDescription, style },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error('Imagem não retornada pela IA');

      setImages(prev => ({ ...prev, [conceptId]: data.imageUrl }));
      toast.success('Imagem gerada com sucesso!');
      return data.imageUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar imagem';
      toast.error(message);
      return null;
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(conceptId);
        return next;
      });
    }
  };

  const clearImage = (conceptId: string) => {
    setImages(prev => {
      const next = { ...prev };
      delete next[conceptId];
      return next;
    });
  };

  return { generateImage, isLoading, getImage, clearImage };
}
