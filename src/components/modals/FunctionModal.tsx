import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFunctions, ProductFunction } from '@/hooks/useFunctions';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_COLORS } from '@/types/morpho';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FunctionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFunction?: ProductFunction;
}

const categories: ProductFunction['category'][] = ['Mecânica', 'Elétrica', 'Térmica', 'Hidráulica', 'Química', 'Outra'];

export function FunctionModal({ open, onOpenChange, editingFunction }: FunctionModalProps) {
  const { addFunction, updateFunction, isAdding, isUpdating } = useFunctions();
  const { isReadOnly } = useUserRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductFunction['category']>('Mecânica');
  const [color, setColor] = useState('#ef4444');
  const [aiCount, setAiCount] = useState<number>(3);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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
      setAiCount(3);
    }
  }, [editingFunction, open]);

  useEffect(() => {
    setColor(CATEGORY_COLORS[category]);
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error('Modo somente leitura — semestre encerrado');
      return;
    }
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

  const handleCreateWithAI = async () => {
    if (isReadOnly) {
      toast.error('Modo somente leitura — semestre encerrado');
      return;
    }
    if (!name.trim()) {
      toast.error('Informe o nome da função');
      return;
    }
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }
    const count = Math.max(1, Math.min(10, Number(aiCount) || 3));
    setIsGeneratingAI(true);
    try {
      // 1) Create function
      const { data: funcRow, error: funcError } = await supabase
        .from('functions')
        .insert({
          name,
          description,
          category,
          color,
          is_public: true,
          created_by: user.id,
        })
        .select()
        .single();
      if (funcError) throw funcError;

      // 2) Generate principles via edge function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-function-principles', {
        body: {
          functionName: name,
          functionDescription: description,
          category,
          count,
        },
      });
      if (aiError) throw new Error(aiError.message);
      if (aiData?.error) throw new Error(aiData.error);
      const principles = Array.isArray(aiData?.principles) ? aiData.principles : [];
      if (principles.length === 0) throw new Error('A IA não retornou princípios');

      // 3) Insert principles
      const rows = principles.map((p: any) => ({
        title: p.title,
        description: p.description,
        function_id: funcRow.id,
        tags: p.tags || [],
        complexity: p.complexity ?? 3,
        cost: p.cost ?? 'Médio',
        is_public: true,
        created_by: user.id,
      }));
      const { error: insertError } = await supabase.from('principles').insert(rows);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['functions'] });
      queryClient.invalidateQueries({ queryKey: ['principles'] });
      toast.success(`Função criada com ${principles.length} princípio(s) gerados pela IA!`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar princípios');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const isLoading = isAdding || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {!editingFunction && (
            <div className="space-y-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
              <Label className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                Gerar princípios de solução com IA
              </Label>
              <p className="text-xs text-muted-foreground">
                Cria a função e usa o título + descrição para gerar princípios automaticamente.
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="ai-count" className="text-xs shrink-0">Quantidade:</Label>
                <Input
                  id="ai-count"
                  type="number"
                  min={1}
                  max={10}
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  className="h-8 w-20"
                  disabled={isGeneratingAI}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="ml-auto gap-2"
                  onClick={handleCreateWithAI}
                  disabled={isGeneratingAI || isReadOnly || !name.trim()}
                >
                  {isGeneratingAI ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Criar + gerar princípios</>
                  )}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || isReadOnly || isGeneratingAI} title={isReadOnly ? 'Modo somente leitura — semestre encerrado' : undefined}>
              {editingFunction ? 'Salvar' : 'Criar Função'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
