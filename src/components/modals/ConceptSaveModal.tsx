import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Upload, Trash2, ImageOff } from 'lucide-react';
import { useConcepts } from '@/hooks/useConcepts';
import { useFunctions } from '@/hooks/useFunctions';
import { usePrinciples } from '@/hooks/usePrinciples';
import { useUserRole } from '@/hooks/useUserRole';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConceptSaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matrixId: string;
  selections: Record<string, string>;
  onSaved: () => void;
}

export function ConceptSaveModal({
  open,
  onOpenChange,
  matrixId,
  selections,
  onSaved,
}: ConceptSaveModalProps) {
  const { addConcept, isAdding } = useConcepts();
  const { functions } = useFunctions();
  const { principles } = usePrinciples();
  const { isReadOnly } = useUserRole();
  const { uploadImage, isUploading } = useImageUpload();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName('');
    setDescription('');
    setImageUrl(null);
  };

  const handleGenerateImage = async () => {
    if (!name.trim()) {
      toast.error('Digite um nome para o conceito antes de gerar a imagem');
      return;
    }
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-concept-image', {
        body: {
          conceptName: name,
          conceptDescription: description || name,
          style: 'render3d',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error('Imagem não retornada pela IA');
      setImageUrl(data.imageUrl);
      toast.success('Imagem gerada!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar imagem');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }
    const url = await uploadImage(file, 'concepts');
    if (url) setImageUrl(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error('Modo somente leitura — semestre encerrado');
      return;
    }
    if (!name.trim()) {
      toast.error('Digite um nome para o conceito');
      return;
    }

    addConcept({
      name,
      matrixId,
      selections,
      description,
      generatedBy: 'manual',
      imageUrl,
    });

    reset();
    onSaved();
    onOpenChange(false);
  };

  const getFunctionName = (funcId: string) =>
    functions.find(f => f.id === funcId)?.name || 'Função';

  const getPrincipleTitle = (principleId: string) =>
    principles.find(p => p.id === principleId)?.title || 'Princípio';

  const getFunctionColor = (funcId: string) =>
    functions.find(f => f.id === funcId)?.color || '#6b7280';

  const busy = generatingImage || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Salvar Conceito</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concept-name">Nome do conceito *</Label>
            <Input
              id="concept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Conceito Alpha"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concept-description">Descrição / Justificativa</Label>
            <Textarea
              id="concept-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as razões das escolhas feitas..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem (opcional)</Label>
            {imageUrl ? (
              <div className="rounded-lg overflow-hidden border bg-muted/30">
                <img
                  src={imageUrl}
                  alt="Pré-visualização do conceito"
                  className="w-full h-auto max-h-56 object-contain"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 flex flex-col items-center justify-center text-center gap-1">
                <ImageOff className="w-6 h-6 text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">Nenhuma imagem ainda</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={busy}
              >
                {generatingImage ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                {imageUrl ? 'Regerar com IA' : 'Gerar com IA'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Enviar do computador
              </Button>
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageUrl(null)}
                  disabled={busy}
                >
                  <Trash2 className="w-4 h-4 mr-1 text-destructive" />
                  Remover
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Seleções do conceito</Label>
            <div className="bg-muted rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(selections).map(([funcId, principleId]) => (
                <div key={funcId} className="flex items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className="shrink-0"
                    style={{ borderColor: getFunctionColor(funcId) }}
                  >
                    {getFunctionName(funcId).slice(0, 25)}...
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium truncate">{getPrincipleTitle(principleId)}</span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isAdding || isReadOnly || busy}
              title={isReadOnly ? 'Modo somente leitura — semestre encerrado' : undefined}
            >
              Salvar Conceito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
