import { useState } from 'react';
import { Search, Lightbulb, Trash2, Calendar, Download, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useConcepts } from '@/hooks/useConcepts';
import { useFunctions } from '@/hooks/useFunctions';
import { usePrinciples } from '@/hooks/usePrinciples';
import { useMatrices } from '@/hooks/useMatrices';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Concepts() {
  const { concepts, deleteConcept, isLoading: loadingConcepts } = useConcepts();
  const { functions, isLoading: loadingFunctions } = useFunctions();
  const { principles, isLoading: loadingPrinciples } = usePrinciples();
  const { matrices, isLoading: loadingMatrices } = useMatrices();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewConcept, setViewConcept] = useState<string | null>(null);

  const isLoading = loadingConcepts || loadingFunctions || loadingPrinciples || loadingMatrices;

  const filteredConcepts = concepts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteConcept(deleteId);
      setDeleteId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMatrixName = (matrixId: string) =>
    matrices.find(m => m.id === matrixId)?.name || 'Matriz removida';

  const getFunctionName = (funcId: string) =>
    functions.find(f => f.id === funcId)?.name || 'Função';

  const getPrincipleTitle = (principleId: string) =>
    principles.find(p => p.id === principleId)?.title || 'Princípio';

  const getFunctionColor = (funcId: string) =>
    functions.find(f => f.id === funcId)?.color || '#6b7280';

  const currentViewConcept = concepts.find(c => c.id === viewConcept);

  const handleExport = (concept: typeof concepts[0]) => {
    const data = {
      name: concept.name,
      description: concept.description,
      generatedBy: concept.generatedBy,
      createdAt: concept.createdAt,
      selections: Object.entries(concept.selections).map(([funcId, principleId]) => ({
        function: getFunctionName(funcId),
        principle: getPrincipleTitle(principleId),
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${concept.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conceito exportado!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conceitos Gerados</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie os conceitos gerados a partir das matrizes
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conceito..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConcepts.length === 0 ? (
          <Card className="py-16">
            <div className="text-center">
              <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {search ? 'Nenhum conceito encontrado' : 'Nenhum conceito gerado'}
              </h3>
              <p className="text-muted-foreground">
                {search ? 'Tente outra busca' : 'Conceitos aparecerão aqui quando você salvá-los no editor de matriz'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredConcepts.map((concept) => (
              <Card key={concept.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-warning" />
                    </div>
                    <Badge 
                      variant={concept.generatedBy === 'ia' ? 'default' : 'secondary'}
                      className={concept.generatedBy === 'ia' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0' : ''}
                    >
                      {concept.generatedBy === 'ia' ? '✨ IA' : '✏️ Manual'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1">{concept.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mb-3">
                    {concept.description || 'Sem descrição'}
                  </CardDescription>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {Object.keys(concept.selections).slice(0, 3).map(funcId => (
                      <Badge 
                        key={funcId} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: getFunctionColor(funcId) }}
                      >
                        {getFunctionName(funcId).slice(0, 15)}...
                      </Badge>
                    ))}
                    {Object.keys(concept.selections).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{Object.keys(concept.selections).length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <span className="truncate">{getMatrixName(concept.matrixId)}</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(concept.createdAt).split(',')[0]}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setViewConcept(concept.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport(concept)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDeleteId(concept.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este conceito? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewConcept} onOpenChange={() => setViewConcept(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentViewConcept?.name}</DialogTitle>
          </DialogHeader>
          {currentViewConcept && (
            <div className="space-y-4">
              {currentViewConcept.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
                  <p className="text-foreground">{currentViewConcept.description}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Seleções</h4>
                <div className="space-y-2 bg-muted rounded-lg p-3">
                  {Object.entries(currentViewConcept.selections).map(([funcId, principleId]) => (
                    <div key={funcId} className="flex items-center gap-2 text-sm">
                      <Badge 
                        variant="outline"
                        style={{ borderColor: getFunctionColor(funcId) }}
                      >
                        {getFunctionName(funcId)}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{getPrincipleTitle(principleId)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Matriz: {getMatrixName(currentViewConcept.matrixId)}</span>
                <span>Criado em: {formatDate(currentViewConcept.createdAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
