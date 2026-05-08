import { useRef, useState } from 'react';
import { Search, Lightbulb, Trash2, Calendar, Download, Eye, Loader2, ShieldAlert, AlertTriangle, Info, Sparkles, Upload, ImageOff } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { resolveSnapshot, type ResolvedSelection } from '@/lib/snapshotResolver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner';
import { useConcepts } from '@/hooks/useConcepts';
import { useFunctions } from '@/hooks/useFunctions';
import { usePrinciples } from '@/hooks/usePrinciples';
import { useMatrices } from '@/hooks/useMatrices';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
  const { concepts, deleteConcept, updateConcept, isLoading: loadingConcepts } = useConcepts();
  const { functions, isLoading: loadingFunctions } = useFunctions();
  const { principles, isLoading: loadingPrinciples } = usePrinciples();
  const { matrices, isLoading: loadingMatrices } = useMatrices();
  const { user } = useAuth();
  const { isReadOnly, isTeacher } = useUserRole();
  const { uploadImage, isUploading } = useImageUpload();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewConcept, setViewConcept] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resolveConcept = (concept: typeof concepts[0]): ResolvedSelection[] =>
    resolveSnapshot(concept.selectionsSnapshot, concept.selections, functions, principles);

  const currentViewConcept = concepts.find(c => c.id === viewConcept);
  const currentResolved = currentViewConcept ? resolveConcept(currentViewConcept) : [];

  const handleExport = (concept: typeof concepts[0]) => {
    const resolved = resolveConcept(concept);
    const data = {
      name: concept.name,
      description: concept.description,
      generatedBy: concept.generatedBy,
      createdAt: concept.createdAt,
      selections: resolved.map(r => ({
        function: r.functionName,
        principle: r.principleTitle,
        sourceStatus: r.status,
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

  const canEditConcept = (conceptId: string) => {
    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return false;
    const matrix = matrices.find(m => m.id === concept.matrixId);
    const isOwner = matrix?.userId === user?.id;
    return (isOwner && !isReadOnly) || isTeacher;
  };

  const handleGenerateImage = async (conceptId: string) => {
    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return;
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-concept-image', {
        body: {
          conceptName: concept.name,
          conceptDescription: concept.description || concept.name,
          style: 'render3d',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error('Imagem não retornada pela IA');
      updateConcept({ id: conceptId, imageUrl: data.imageUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar imagem');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleUploadImage = async (file: File, conceptId: string) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }
    const url = await uploadImage(file, 'concepts');
    if (url) updateConcept({ id: conceptId, imageUrl: url });
  };

  return (
    <DashboardLayout>
      <TooltipProvider>
      <div className="space-y-6">
        {isReadOnly && <ReadOnlyBanner />}
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
            {filteredConcepts.map((concept) => {
              const matrix = matrices.find(m => m.id === concept.matrixId);
              const isOwner = matrix?.userId === user?.id;
              const canDelete = isOwner ? !isReadOnly : isTeacher;
              const showModerateBadge = isTeacher && !isOwner;
              const cardResolved = resolveConcept(concept);
              const hasSourceChanges = cardResolved.some(r => r.status !== 'identical');
              return (
              <Card key={concept.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-warning" />
                    </div>
                    <div className="flex items-center gap-1">
                      {showModerateBadge && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <ShieldAlert className="w-3 h-3" /> Moderar
                        </Badge>
                      )}
                      <Badge
                        variant={concept.generatedBy === 'ia' ? 'default' : 'secondary'}
                        className={concept.generatedBy === 'ia' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0' : ''}
                      >
                        {concept.generatedBy === 'ia' ? '✨ IA' : '✏️ Manual'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1 line-clamp-1">{concept.name}</CardTitle>
                  {concept.imageUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden bg-muted/40 aspect-video">
                      <img
                        src={concept.imageUrl}
                        alt={concept.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardDescription className="line-clamp-2 mb-3 break-words">
                    {concept.description || 'Sem descrição'}
                  </CardDescription>
                  
                  <div className="flex flex-wrap items-center gap-1 mb-3">
                    {cardResolved.slice(0, 3).map(r => (
                      <Badge
                        key={r.functionId}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: r.functionColor }}
                      >
                        {(r.functionName || 'Função').slice(0, 15)}{(r.functionName || '').length > 15 ? '…' : ''}
                      </Badge>
                    ))}
                    {cardResolved.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{cardResolved.length - 3}
                      </Badge>
                    )}
                    {hasSourceChanges && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs gap-1 border-warning/60 text-warning">
                            <AlertTriangle className="w-3 h-3" /> Fonte alterada
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Algum princípio foi modificado ou removido após o uso. O conceito mantém a versão original.
                        </TooltipContent>
                      </Tooltip>
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
                    {canDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(concept.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showModerateBadge ? 'Remover como moderador' : 'Excluir conceito'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="break-words pr-6">{currentViewConcept?.name}</DialogTitle>
          </DialogHeader>
          {currentViewConcept && (
            <div className="space-y-4">
              {currentViewConcept.imageUrl ? (
                <div className="rounded-xl overflow-hidden bg-muted/40 border relative group">
                  <img
                    src={currentViewConcept.imageUrl}
                    alt={currentViewConcept.name}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 p-6 flex flex-col items-center justify-center text-center gap-2">
                  <ImageOff className="w-8 h-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma imagem associada a este conceito
                  </p>
                </div>
              )}

              {canEditConcept(currentViewConcept.id) && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateImage(currentViewConcept.id)}
                    disabled={generatingImage || isUploading}
                  >
                    {generatingImage ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    {currentViewConcept.imageUrl ? 'Regerar com IA' : 'Gerar com IA'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={generatingImage || isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    Enviar do computador
                  </Button>
                  {currentViewConcept.imageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage(currentViewConcept.id)}
                      disabled={generatingImage || isUploading}
                    >
                      <Trash2 className="w-4 h-4 mr-1 text-destructive" />
                      Remover imagem
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && currentViewConcept) {
                        handleUploadImage(file, currentViewConcept.id);
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
              {currentViewConcept.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
                  <p className="text-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {currentViewConcept.description}
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Seleções</h4>
                <div className="space-y-2 bg-muted rounded-lg p-3">
                  {currentResolved.map((r) => (
                    <div key={r.functionId} className="flex items-start gap-2 text-sm flex-wrap">
                      <Badge
                        variant="outline"
                        style={{ borderColor: r.functionColor }}
                      >
                        {r.functionName || 'Função removida'}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{r.principleTitle || 'Princípio sem título'}</span>
                      {r.status === 'removed' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="gap-1 bg-warning/15 text-warning border border-warning/40 hover:bg-warning/20">
                              <AlertTriangle className="w-3 h-3" /> Fonte original removida
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Este princípio foi modificado/removido pelo autor após você usá-lo. Seu conceito continua exibindo a versão original.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {r.status === 'modified' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="gap-1 bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">
                              <Info className="w-3 h-3" /> Fonte original alterada após uso
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Este princípio foi modificado/removido pelo autor após você usá-lo. Seu conceito continua exibindo a versão original.
                          </TooltipContent>
                        </Tooltip>
                      )}
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
      </TooltipProvider>
    </DashboardLayout>
  );
}
