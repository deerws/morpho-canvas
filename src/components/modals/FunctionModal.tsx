import { useEffect, useState } from 'react';
import { Loader2, Sparkles, ArrowLeft, Star, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFunctions, ProductFunction } from '@/hooks/useFunctions';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_COLORS } from '@/types/morpho';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FunctionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFunction?: ProductFunction;
}

const categories: ProductFunction['category'][] = ['Mecânica', 'Elétrica', 'Térmica', 'Hidráulica', 'Química', 'Outra'];

type DraftPrinciple = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  complexity: number;
  cost: 'Baixo' | 'Médio' | 'Alto';
  selected: boolean;
};

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
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [draftPrinciples, setDraftPrinciples] = useState<DraftPrinciple[] | null>(null);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

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
    setDraftPrinciples(null);
    setTagInputs({});
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

  const handleGenerateAI = async () => {
    if (isReadOnly) {
      toast.error('Modo somente leitura — semestre encerrado');
      return;
    }
    if (!name.trim()) {
      toast.error('Informe o nome da função');
      return;
    }
    const count = Math.max(1, Math.min(10, Number(aiCount) || 3));
    setIsGeneratingAI(true);
    try {
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

      setDraftPrinciples(
        principles.map((p: any) => ({
          id: crypto.randomUUID(),
          title: String(p.title || ''),
          description: String(p.description || ''),
          tags: Array.isArray(p.tags) ? p.tags.map((t: any) => String(t)) : [],
          complexity: Math.max(1, Math.min(5, Number(p.complexity) || 3)),
          cost: (['Baixo', 'Médio', 'Alto'].includes(p.cost) ? p.cost : 'Médio') as DraftPrinciple['cost'],
          selected: true,
        }))
      );
      toast.success(`${principles.length} princípio(s) gerados. Revise antes de salvar.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar princípios');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const updateDraft = (id: string, patch: Partial<DraftPrinciple>) => {
    setDraftPrinciples((prev) => prev?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? null);
  };

  const removeDraft = (id: string) => {
    setDraftPrinciples((prev) => prev?.filter((p) => p.id !== id) ?? null);
  };

  const addTagTo = (id: string) => {
    const value = (tagInputs[id] || '').trim();
    if (!value) return;
    setDraftPrinciples((prev) =>
      prev?.map((p) => (p.id === id && !p.tags.includes(value) ? { ...p, tags: [...p.tags, value] } : p)) ?? null
    );
    setTagInputs((prev) => ({ ...prev, [id]: '' }));
  };

  const removeTagFrom = (id: string, tag: string) => {
    setDraftPrinciples((prev) =>
      prev?.map((p) => (p.id === id ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p)) ?? null
    );
  };

  const handleSavePreview = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }
    if (!draftPrinciples) return;
    const selected = draftPrinciples.filter((p) => p.selected);
    if (selected.length === 0) {
      toast.error('Selecione ao menos um princípio para salvar');
      return;
    }
    for (const p of selected) {
      if (!p.title.trim() || !p.description.trim()) {
        toast.error('Todos os princípios selecionados precisam de título e descrição');
        return;
      }
    }
    setIsSavingPreview(true);
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

      // 2) Insert selected principles
      const rows = selected.map((p) => ({
        title: p.title,
        description: p.description,
        function_id: funcRow.id,
        tags: p.tags,
        complexity: p.complexity,
        cost: p.cost,
        is_public: true,
        created_by: user.id,
      }));
      const { error: insertError } = await supabase.from('principles').insert(rows);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['functions'] });
      queryClient.invalidateQueries({ queryKey: ['principles'] });
      toast.success(`Função criada com ${selected.length} princípio(s)!`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setIsSavingPreview(false);
    }
  };

  const isLoading = isAdding || isUpdating;
  const isPreviewing = draftPrinciples !== null;
  const selectedCount = draftPrinciples?.filter((p) => p.selected).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", isPreviewing ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPreviewing && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setDraftPrinciples(null)}
                disabled={isSavingPreview}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {isPreviewing
              ? `Revisar princípios gerados (${selectedCount}/${draftPrinciples?.length})`
              : editingFunction
              ? 'Editar Função'
              : 'Nova Função'}
          </DialogTitle>
        </DialogHeader>

        {isPreviewing ? (
          <div className="space-y-3">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">{name}</p>
              {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
              <Badge variant="secondary" className="mt-2 text-xs">{category}</Badge>
            </div>

            {draftPrinciples!.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Nenhum princípio na lista. Volte e gere novamente.
              </p>
            )}

            {draftPrinciples!.map((p, idx) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-md border p-3 space-y-2 transition-colors",
                  p.selected ? "border-primary/50 bg-primary/5" : "border-border opacity-60"
                )}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={p.selected}
                    onCheckedChange={(v) => updateDraft(p.id, { selected: Boolean(v) })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Princípio {idx + 1}</Label>
                    <Input
                      value={p.title}
                      onChange={(e) => updateDraft(p.id, { title: e.target.value })}
                      placeholder="Título"
                      className="mt-1"
                      disabled={!p.selected}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeDraft(p.id)}
                    title="Descartar"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <Textarea
                  value={p.description}
                  onChange={(e) => updateDraft(p.id, { description: e.target.value })}
                  placeholder="Descrição"
                  rows={3}
                  disabled={!p.selected}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Complexidade</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateDraft(p.id, { complexity: n })}
                          disabled={!p.selected}
                          className="p-0.5 disabled:cursor-not-allowed"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4 transition-colors",
                              n <= p.complexity ? "fill-warning text-warning" : "text-muted-foreground"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Custo</Label>
                    <Select
                      value={p.cost}
                      onValueChange={(v) => updateDraft(p.id, { cost: v as DraftPrinciple['cost'] })}
                      disabled={!p.selected}
                    >
                      <SelectTrigger className="h-8">
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

                <div className="space-y-1">
                  <Label className="text-xs">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInputs[p.id] || ''}
                      onChange={(e) => setTagInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTagTo(p.id);
                        }
                      }}
                      placeholder="Nova tag..."
                      className="h-8"
                      disabled={!p.selected}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => addTagTo(p.id)}
                      disabled={!p.selected}
                    >
                      +
                    </Button>
                  </div>
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                          {tag}
                          {p.selected && (
                            <X className="w-3 h-3 cursor-pointer" onClick={() => removeTagFrom(p.id, tag)} />
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAI}
                disabled={isGeneratingAI || isSavingPreview}
              >
                {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar novamente
              </Button>
              <Button
                type="button"
                onClick={handleSavePreview}
                disabled={isSavingPreview || selectedCount === 0}
              >
                {isSavingPreview ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  `Salvar função + ${selectedCount} princípio(s)`
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
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
                  Use o título + descrição para gerar princípios. Você poderá revisar e editar antes de salvar.
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
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI || isReadOnly || !name.trim()}
                  >
                    {isGeneratingAI ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Gerar e revisar</>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
