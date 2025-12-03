import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFunctions, ProductFunction } from '@/hooks/useFunctions';
import { CATEGORY_COLORS } from '@/types/morpho';
import { toast } from 'sonner';

interface FunctionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFunction?: ProductFunction;
}

const categories: ProductFunction['category'][] = ['Mecânica', 'Elétrica', 'Térmica', 'Hidráulica', 'Química', 'Outra'];

export function FunctionModal({ open, onOpenChange, editingFunction }: FunctionModalProps) {
  const { addFunction, updateFunction, isAdding, isUpdating } = useFunctions();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductFunction['category']>('Mecânica');
  const [color, setColor] = useState('#ef4444');

  useEffect(() => {
    if (editingFunction) {
      setName(editingFunction.name);
      setDescription(editingFunction.description || '');
      setCategory(editingFunction.category);
      setColor(editingFunction.color);
    } else {
      setName('');
      setDescription('');
      setCategory('Mecânica');
      setColor(CATEGORY_COLORS['Mecânica']);
    }
  }, [editingFunction, open]);

  useEffect(() => {
    setColor(CATEGORY_COLORS[category]);
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome da função é obrigatório');
      return;
    }

    if (editingFunction) {
      updateFunction({ id: editingFunction.id, name, description, category, color });
    } else {
      addFunction({
        name,
        description,
        category,
        color,
        isPublic: true,
      });
    }
    onOpenChange(false);
  };

  const isLoading = isAdding || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingFunction ? 'Editar Função' : 'Nova Função'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="func-name">Nome da função *</Label>
            <Input
              id="func-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Converter energia térmica para cinética"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="func-description">Descrição</Label>
            <Textarea
              id="func-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição detalhada da função..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="func-category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProductFunction['category'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="func-color">Cor de identificação</Label>
              <div className="flex gap-2">
                <Input
                  id="func-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingFunction ? 'Salvar' : 'Criar Função'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
