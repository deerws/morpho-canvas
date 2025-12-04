import { useState } from 'react';
import { Sparkles, Loader2, ThumbsUp, ThumbsDown, Save, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIConceptGeneration, GeneratedConcept } from '@/hooks/useAIConceptGeneration';
import { cn } from '@/lib/utils';

interface Function {
  id: string;
  name: string;
  category: string;
}

interface Principle {
  id: string;
  title: string;
  description: string;
  functionId: string;
}

interface AIConceptGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  functions: Function[];
  principles: Principle[];
  selections: Record<string, string>;
  onSaveConcept: (concept: { name: string; description: string; generatedBy: 'ia' }) => void;
}

export function AIConceptGeneratorModal({
  open,
  onOpenChange,
  functions,
  principles,
  selections,
  onSaveConcept
}: AIConceptGeneratorModalProps) {
  const [numConcepts, setNumConcepts] = useState(3);
  const [temperature, setTemperature] = useState(0.7);
  const [focus, setFocus] = useState<'innovation' | 'feasibility' | 'cost'>('innovation');
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});

  const { isGenerating, generatedConcepts, error, generateConcepts, clearConcepts } = useAIConceptGeneration();

  const selectedPrinciplesCount = Object.keys(selections).length;

  const handleGenerate = async () => {
    const principlesWithFunctionName = principles.map(p => {
      const func = functions.find(f => f.id === p.functionId);
      return {
        ...p,
        functionName: func?.name || 'Unknown'
      };
    });

    await generateConcepts(
      functions,
      principlesWithFunctionName,
      selections,
      { numConcepts, temperature, focus }
    );
  };

  const handleSaveConcept = (concept: GeneratedConcept) => {
    onSaveConcept({
      name: concept.name,
      description: `${concept.description}\n\n**Raciocínio:** ${concept.reasoning}\n\n**Vantagens:** ${concept.advantages.join(', ')}\n\n**Desafios:** ${concept.challenges.join(', ')}`,
      generatedBy: 'ia'
    });
  };

  const handleFeedback = (conceptId: string, type: 'up' | 'down') => {
    setFeedback(prev => ({
      ...prev,
      [conceptId]: prev[conceptId] === type ? undefined! : type
    }));
  };

  const toggleExpand = (conceptId: string) => {
    setExpandedConcept(prev => prev === conceptId ? null : conceptId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCostLabel = (cost: string) => {
    switch (cost) {
      case 'low': return { label: 'Baixo', variant: 'secondary' as const };
      case 'medium': return { label: 'Médio', variant: 'outline' as const };
      case 'high': return { label: 'Alto', variant: 'destructive' as const };
      default: return { label: cost, variant: 'outline' as const };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerador de Conceitos com IA
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Analisando {functions.length} funções × {selectedPrinciplesCount} princípios selecionados
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Configuration Panel */}
          <div className="w-72 flex-shrink-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Quantidade de conceitos: {numConcepts}</Label>
                  <Slider
                    value={[numConcepts]}
                    onValueChange={([v]) => setNumConcepts(v)}
                    min={1}
                    max={5}
                    step={1}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Criatividade: {Math.round(temperature * 100)}%</Label>
                  <Slider
                    value={[temperature]}
                    onValueChange={([v]) => setTemperature(v)}
                    min={0.1}
                    max={1}
                    step={0.1}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Foco da Geração</Label>
                  <RadioGroup
                    value={focus}
                    onValueChange={(v) => setFocus(v as typeof focus)}
                    disabled={isGenerating}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="innovation" id="innovation" />
                      <Label htmlFor="innovation" className="text-sm font-normal">Inovação</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="feasibility" id="feasibility" />
                      <Label htmlFor="feasibility" className="text-sm font-normal">Viabilidade</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cost" id="cost" />
                      <Label htmlFor="cost" className="text-sm font-normal">Custo</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedPrinciplesCount === 0}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Conceitos
                    </>
                  )}
                </Button>

                {selectedPrinciplesCount === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Selecione princípios na matriz para gerar conceitos
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="flex-1 min-w-0">
            <ScrollArea className="h-[60vh]">
              {isGenerating ? (
                <div className="space-y-4">
                  {Array.from({ length: numConcepts }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <Card className="border-destructive">
                  <CardContent className="p-4 text-center">
                    <p className="text-destructive">{error}</p>
                    <Button variant="outline" onClick={handleGenerate} className="mt-4">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Tentar Novamente
                    </Button>
                  </CardContent>
                </Card>
              ) : generatedConcepts.length > 0 ? (
                <div className="space-y-4 pr-4">
                  {generatedConcepts.map((concept) => {
                    const isExpanded = expandedConcept === concept.id;
                    const costInfo = getCostLabel(concept.costEstimate);

                    return (
                      <Card key={concept.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  IA
                                </Badge>
                                <span className={cn("text-sm font-semibold", getScoreColor(concept.innovationScore))}>
                                  {concept.innovationScore}/100
                                </span>
                              </div>
                              <h3 className="font-semibold text-foreground mb-2">{concept.name}</h3>
                              <p className={cn("text-sm text-muted-foreground", !isExpanded && "line-clamp-2")}>
                                {concept.description}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(concept.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 space-y-3 border-t pt-4">
                              <div>
                                <h4 className="text-sm font-medium mb-1">Raciocínio</h4>
                                <p className="text-sm text-muted-foreground">{concept.reasoning}</p>
                              </div>

                              <div className="flex gap-4">
                                <div>
                                  <span className="text-xs text-muted-foreground">Inovação</span>
                                  <p className={cn("font-semibold", getScoreColor(concept.innovationScore))}>
                                    {concept.innovationScore}/100
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Viabilidade</span>
                                  <p className={cn("font-semibold", getScoreColor(concept.feasibilityScore))}>
                                    {concept.feasibilityScore}/100
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Custo</span>
                                  <Badge variant={costInfo.variant}>{costInfo.label}</Badge>
                                </div>
                              </div>

                              {concept.advantages.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-green-600 mb-1">✅ Vantagens</h4>
                                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                                    {concept.advantages.map((adv, i) => (
                                      <li key={i}>{adv}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {concept.challenges.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-amber-600 mb-1">⚠️ Desafios</h4>
                                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                                    {concept.challenges.map((ch, i) => (
                                      <li key={i}>{ch}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <div className="flex items-center gap-2">
                              <Button
                                variant={feedback[concept.id] === 'up' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleFeedback(concept.id, 'up')}
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={feedback[concept.id] === 'down' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleFeedback(concept.id, 'down')}
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveConcept(concept)}
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Salvar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Configure as opções e clique em "Gerar Conceitos" para começar
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Dica: Selecione princípios na matriz antes de gerar conceitos
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
