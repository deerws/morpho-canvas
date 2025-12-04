import { useEffect, useState, useRef } from 'react';
import { Upload, X, Star, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFunctions } from '@/hooks/useFunctions';
import { usePrinciples, Principle } from '@/hooks/usePrinciples';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PrincipleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPrinciple?: Principle;
  defaultFunctionId?: string;
}

export function PrincipleModal({ open, onOpenChange, editingPrinciple, defaultFunctionId }: PrincipleModalProps) {
  const { functions } = useFunctions();
  const { addPrinciple, updatePrinciple, isAdding, isUpdating } = usePrinciples();
  const { uploadImage, deleteImage, isUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [functionId, setFunctionId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [complexity, setComplexity] = useState(3);
  const [cost, setCost] = useState<Principle['cost']>('Médio');

  useEffect(() => {
    if (editingPrinciple) {
      setTitle(editingPrinciple.title);
      setDescription(editingPrinciple.description);
      setFunctionId(editingPrinciple.functionId);
      setImageUrl(editingPrinciple.imageUrl || '');
      setPreviewUrl(editingPrinciple.imageUrl || '');
      setTags(editingPrinciple.tags);
      setComplexity(editingPrinciple.complexity);
      setCost(editingPrinciple.cost);
      setPendingFile(null);
    } else {
      setTitle('');
      setDescription('');
      setFunctionId(defaultFunctionId || '');
      setImageUrl('');
      setPreviewUrl('');
      setTags([]);
      setComplexity(3);
      setCost('Médio');
      setPendingFile(null);
    }
  }, [editingPrinciple, defaultFunctionId, open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPendingFile(null);
    setPreviewUrl('');
    setImageUrl('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('O título do princípio é obrigatório');
      return;
    }
    if (!functionId) {
      toast.error('Selecione uma função associada');
      return;
    }
    if (!description.trim()) {
      toast.error('A descrição é obrigatória');
      return;
    }

    let finalImageUrl = imageUrl;

    // Upload new image if there's a pending file
    if (pendingFile) {
      const uploadedUrl = await uploadImage(pendingFile);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
        // Delete old image if editing
        if (editingPrinciple?.imageUrl && editingPrinciple.imageUrl !== finalImageUrl) {
          await deleteImage(editingPrinciple.imageUrl);
        }
      } else {
        return; // Upload failed, don't proceed
      }
    } else if (!previewUrl && editingPrinciple?.imageUrl) {
      // Image was removed
      await deleteImage(editingPrinciple.imageUrl);
      finalImageUrl = '';
    }

    if (editingPrinciple) {
      updatePrinciple({ 
        id: editingPrinciple.id, 
        title, 
        description, 
        functionId, 
        imageUrl: finalImageUrl || null, 
        tags, 
        complexity, 
        cost 
      });
    } else {
      addPrinciple({
        title,
        description,
        functionId,
        imageUrl: finalImageUrl || null,
        tags,
        complexity,
        cost,
        isPublic: true,
      });
    }
    onOpenChange(false);
  };

  const isLoading = isAdding || isUpdating || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPrinciple ? 'Editar Princípio' : 'Novo Princípio de Solução'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="principle-title">Título do princípio *</Label>
            <Input
              id="principle-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Motor Stirling"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="principle-function">Função associada *</Label>
            <Select value={functionId} onValueChange={setFunctionId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função..." />
              </SelectTrigger>
              <SelectContent>
                {functions.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="principle-description">Descrição detalhada *</Label>
            <Textarea
              id="principle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente o princípio, materiais, funcionamento, aplicações..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem do princípio</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors",
                previewUrl ? "border-primary" : "border-border"
              )}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-0 right-0 h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                    disabled={isUploading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? 'Enviando...' : 'Clique ou arraste uma imagem'}
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <p className="text-xs text-muted-foreground">
              Caso não envie imagem, será exibido o título na matriz
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Adicionar tag..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Adicionar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Complexidade</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setComplexity(n)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        "w-5 h-5 transition-colors",
                        n <= complexity ? "fill-warning text-warning" : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custo relativo</Label>
              <Select value={cost} onValueChange={(v) => setCost(v as Principle['cost'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixo">Baixo</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingPrinciple ? 'Salvar' : 'Criar Princípio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
