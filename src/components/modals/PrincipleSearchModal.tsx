import { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFunctions } from '@/hooks/useFunctions';
import { usePrinciples } from '@/hooks/usePrinciples';
import { cn } from '@/lib/utils';

interface PrincipleSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  functionId: string;
  onSelect: (principleId: string) => void;
  onCreateNew: () => void;
}

export function PrincipleSearchModal({ 
  open, 
  onOpenChange, 
  functionId,
  onSelect,
  onCreateNew 
}: PrincipleSearchModalProps) {
  const { principles } = usePrinciples();
  const { functions } = useFunctions();
  const [search, setSearch] = useState('');

  const currentFunction = functions.find(f => f.id === functionId);

  const filteredPrinciples = useMemo(() => {
    return principles.filter(p => {
      const matchesSearch = search.trim() === '' || 
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      
      return matchesSearch;
    }).sort((a, b) => {
      if (a.functionId === functionId && b.functionId !== functionId) return -1;
      if (b.functionId === functionId && a.functionId !== functionId) return 1;
      return b.usageCount - a.usageCount;
    });
  }, [principles, search, functionId]);

  const getFunctionName = (funcId: string) => 
    functions.find(f => f.id === funcId)?.name || 'Sem função';

  const getFunctionColor = (funcId: string) =>
    functions.find(f => f.id === funcId)?.color || '#6b7280';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar Princípio de Solução</DialogTitle>
          {currentFunction && (
            <p className="text-sm text-muted-foreground">
              Para a função: <span className="font-medium">{currentFunction.name}</span>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar princípio por nome, descrição ou tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-80">
            {filteredPrinciples.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhum princípio encontrado</p>
                <Button onClick={onCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar novo princípio
                </Button>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredPrinciples.map(principle => (
                  <div
                    key={principle.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent",
                      principle.functionId === functionId && "border-primary bg-primary/5"
                    )}
                    onClick={() => onSelect(principle.id)}
                  >
                    {principle.imageUrl ? (
                      <img 
                        src={principle.imageUrl} 
                        alt={principle.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <span className="text-lg font-bold text-muted-foreground/50">
                          {principle.title.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-foreground">{principle.title}</h4>
                        <Button variant="secondary" size="sm" className="ml-2 shrink-0">
                          Usar
                        </Button>
                      </div>
                      <Badge
                        variant="outline"
                        className="mt-1 text-xs"
                        style={{ borderColor: getFunctionColor(principle.functionId), color: getFunctionColor(principle.functionId) }}
                      >
                        {getFunctionName(principle.functionId)}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {principle.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>Usado {principle.usageCount}x</span>
                        <span>•</span>
                        <span>Custo: {principle.cost}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-between items-center pt-2 border-t">
            <Button variant="link" onClick={onCreateNew}>
              Não encontrou? Cadastrar novo princípio
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
