import { useEffect, useState, useRef } from 'react';
import { Upload, X, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMorphoStore } from '@/store/morphoStore';
import { Principle } from '@/types/morpho';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PrincipleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPrinciple?: Principle;
  defaultFunctionId?: string;
}

export function PrincipleModal({ open, onOpenChange, editingPrinciple, defaultFunctionId }: PrincipleModalProps) {
  const { addPrinciple, updatePrinciple, functions, user } = useMorphoStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [functionId, setFunctionId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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
      setTags(editingPrinciple.tags);
      setComplexity(editingPrinciple.complexity);
      setCost(editingPrinciple.cost);
    } else {
      setTitle('');
      setDescription('');
      setFunctionId(defaultFunctionId || '');
      setImageUrl('');
      setTags([]);
      setComplexity(3);
      setCost('Médio');
    }
  }, [editingPrinciple, defaultFunctionId, open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('O título do princípio é obrigatório');
      return;
    }
    if (!functionId) {
      toast.error('Selecione uma função associada');
      return;
    }

    if (editingPrinciple) {
      updatePrinciple(editingPrinciple.id, { title, description, functionId, imageUrl, tags, complexity, cost });
      toast.success('Princípio atualizado com sucesso');
    } else {
      addPrinciple({
        id: crypto.randomUUID(),
        title,
        description,
        functionId,
        imageUrl: imageUrl || undefined,
        tags,
        complexity,
        cost,
        usageCount: 0,
        createdBy: user?.id || 'unknown',
        isPublic: true,
      });
      toast.success('Princípio criado com sucesso');
    }
    onOpenChange(false);
  };

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
            <Label htmlFor="principle-description">Descrição detalhada</Label>
            <Textarea
              id="principle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente o princípio, materiais, funcionamento, aplicações..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem do princípio</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors",
                imageUrl ? "border-primary" : "border-border"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Preview" className="max-h-40 mx-auto rounded" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-0 right-0 h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clique ou arraste uma imagem
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
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
            <Button type="submit">
              {editingPrinciple ? 'Salvar' : 'Criar Princípio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
