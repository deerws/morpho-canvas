import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useMorphoStore } from '@/store/morphoStore';
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
  onSaved 
}: ConceptSaveModalProps) {
  const { addConcept, functions, principles } = useMorphoStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Digite um nome para o conceito');
      return;
    }

    addConcept({
      id: crypto.randomUUID(),
      name,
      matrixId,
      selections,
      description,
      createdAt: new Date().toISOString(),
      generatedBy: 'manual',
    });

    toast.success('Conceito salvo com sucesso!');
    setName('');
    setDescription('');
    onSaved();
    onOpenChange(false);
  };

  const getFunctionName = (funcId: string) => 
    functions.find(f => f.id === funcId)?.name || 'Função';

  const getPrincipleTitle = (principleId: string) =>
    principles.find(p => p.id === principleId)?.title || 'Princípio';

  const getFunctionColor = (funcId: string) =>
    functions.find(f => f.id === funcId)?.color || '#6b7280';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <Button type="submit">
              Salvar Conceito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
