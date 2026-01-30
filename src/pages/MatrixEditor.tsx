import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Save, Trash2, ChevronUp, ChevronDown, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMatrices, useMatrix } from '@/hooks/useMatrices';
import { useFunctions } from '@/hooks/useFunctions';
import { usePrinciples } from '@/hooks/usePrinciples';
import { useConcepts } from '@/hooks/useConcepts';
import { PrincipleModal } from '@/components/modals/PrincipleModal';
import { PrincipleSearchModal } from '@/components/modals/PrincipleSearchModal';
import { ConceptSaveModal } from '@/components/modals/ConceptSaveModal';
import { AIConceptGeneratorModal } from '@/components/modals/AIConceptGeneratorModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MatrixEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addMatrix, updateMatrix, isAdding } = useMatrices();
  const { data: existingMatrix, isLoading: loadingMatrix } = useMatrix(id === 'new' ? undefined : id);
  const { functions, isLoading: loadingFunctions } = useFunctions();
  const { principles, incrementUsage, isLoading: loadingPrinciples } = usePrinciples();
  const { addConcept } = useConcepts(id === 'new' ? undefined : id);
  
  const isNew = id === 'new';

  const [matrixName, setMatrixName] = useState('');
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [conceptSelections, setConceptSelections] = useState<Record<string, string>>({});
  const [matrixId, setMatrixId] = useState<string | null>(null);
  
  const [principleModalOpen, setPrincipleModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [conceptModalOpen, setConceptModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [searchFunctionId, setSearchFunctionId] = useState<string>('');

  useEffect(() => {
    if (existingMatrix) {
      setMatrixName(existingMatrix.name);
      setSelectedFunctionIds(existingMatrix.functionIds);
      setMatrixId(existingMatrix.id);
    }
  }, [existingMatrix]);

  useEffect(() => {
    if (!isNew && !loadingMatrix && !existingMatrix && id) {
      navigate('/matrices');
    }
  }, [isNew, existingMatrix, navigate, loadingMatrix, id]);

  const selectedFunctions = functions.filter(f => selectedFunctionIds.includes(f.id));
  
  const getPrinciplesForFunction = (functionId: string) => 
    principles.filter(p => p.functionId === functionId);

  const maxPrinciples = Math.max(
    ...selectedFunctions.map(f => getPrinciplesForFunction(f.id).length),
    1
  );

  const handleAddFunction = (functionId: string) => {
    if (!selectedFunctionIds.includes(functionId)) {
      setSelectedFunctionIds([...selectedFunctionIds, functionId]);
    }
  };

  const handleRemoveFunction = (functionId: string) => {
    setSelectedFunctionIds(selectedFunctionIds.filter(fid => fid !== functionId));
    if (selectedFunction === functionId) {
      setSelectedFunction(null);
    }
    const newSelections = { ...conceptSelections };
    delete newSelections[functionId];
    setConceptSelections(newSelections);
  };

  const handleMoveFunction = (functionId: string, direction: 'up' | 'down') => {
    const index = selectedFunctionIds.indexOf(functionId);
    if (direction === 'up' && index > 0) {
      const newIds = [...selectedFunctionIds];
      [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
      setSelectedFunctionIds(newIds);
    } else if (direction === 'down' && index < selectedFunctionIds.length - 1) {
      const newIds = [...selectedFunctionIds];
      [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
      setSelectedFunctionIds(newIds);
    }
  };

  const handleSelectPrinciple = (functionId: string, principleId: string) => {
    const newSelections = { ...conceptSelections };
    if (newSelections[functionId] === principleId) {
      delete newSelections[functionId];
    } else {
      newSelections[functionId] = principleId;
    }
    setConceptSelections(newSelections);
  };

  const handleAddPrincipleToFunction = (functionId: string) => {
    setSearchFunctionId(functionId);
    setSearchModalOpen(true);
  };

  const handlePrincipleSelected = (principleId: string) => {
    if (searchFunctionId) {
      handleSelectPrinciple(searchFunctionId, principleId);
      incrementUsage(principleId);
    }
    setSearchModalOpen(false);
  };

  const handleSaveMatrix = async () => {
    if (!matrixName.trim()) {
      toast.error('Digite um nome para a matriz');
      return;
    }

    if (isNew) {
      const newMatrix = await addMatrix({
        name: matrixName,
        description: null,
        functionIds: selectedFunctionIds,
      });
      if (newMatrix) {
        setMatrixId(newMatrix.id);
        navigate(`/matrix/${newMatrix.id}`, { replace: true });
      }
    } else if (id) {
      updateMatrix({
        id,
        name: matrixName,
        functionIds: selectedFunctionIds,
      });
    }
  };

  const clearSelections = () => {
    setConceptSelections({});
    toast.info('Seleções limpas');
  };

  const availableFunctions = functions.filter(f => !selectedFunctionIds.includes(f.id));

  const isLoading = loadingMatrix || loadingFunctions || loadingPrinciples;

  if (isLoading && !isNew) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Input
              value={matrixName}
              onChange={(e) => setMatrixName(e.target.value)}
              placeholder="Nome da matriz..."
              className="text-xl font-bold w-80"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSaveMatrix} disabled={isAdding}>
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Salvar Matriz
            </Button>
            <Button 
              variant="outline"
              onClick={() => setAiModalOpen(true)}
              disabled={Object.keys(conceptSelections).length === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar com IA
            </Button>
            <Button 
              onClick={() => setConceptModalOpen(true)}
              disabled={Object.keys(conceptSelections).length === 0}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Gerar Conceito
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          <div className="flex-1 overflow-auto">
            <Card className="h-full">
              <CardContent className="p-4">
                {selectedFunctions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p className="mb-4">Adicione funções para começar a montar sua matriz</p>
                    {availableFunctions.length > 0 && (
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddFunction(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">+ Adicionar função...</option>
                        {availableFunctions.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-card z-10 border border-border p-3 text-left min-w-[200px]">
                            <span className="font-semibold text-foreground">FUNÇÕES DO PRODUTO</span>
                          </th>
                          {Array.from({ length: maxPrinciples }, (_, i) => (
                            <th key={i} className="border border-border p-3 text-center min-w-[140px]">
                              <span className="text-muted-foreground">Solução {i + 1}</span>
                            </th>
                          ))}
                          <th className="border border-border p-3 min-w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFunctions.map((func) => {
                          const funcPrinciples = getPrinciplesForFunction(func.id);
                          return (
                            <tr key={func.id} className="group">
                              <td 
                                className={cn(
                                  "sticky left-0 bg-card z-10 border border-border p-3 cursor-pointer transition-colors",
                                  selectedFunction === func.id ? "bg-primary/10" : "hover:bg-accent"
                                )}
                                onClick={() => setSelectedFunction(func.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: func.color }}
                                  />
                                  <span className="font-medium text-foreground text-sm">{func.name}</span>
                                </div>
                              </td>
                              {Array.from({ length: maxPrinciples }, (_, i) => {
                                const principle = funcPrinciples[i];
                                const isSelected = principle && conceptSelections[func.id] === principle.id;
                                return (
                                  <td 
                                    key={i} 
                                    className={cn(
                                      "border border-border p-2 text-center transition-colors cursor-pointer",
                                      isSelected ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-accent"
                                    )}
                                    onClick={() => principle && handleSelectPrinciple(func.id, principle.id)}
                                  >
                                    {principle ? (
                                      <div className="flex flex-col items-center">
                                        {principle.imageUrl ? (
                                          <img 
                                            src={principle.imageUrl} 
                                            alt={principle.title}
                                            className="w-20 h-20 object-cover rounded mb-1"
                                          />
                                        ) : (
                                          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex items-center justify-center mb-1">
                                            <span className="text-lg font-bold text-muted-foreground/50">
                                              {principle.title.charAt(0)}
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-xs text-foreground font-medium line-clamp-2">
                                          {principle.title}
                                        </span>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddPrincipleToFunction(func.id);
                                        }}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-border p-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleAddPrincipleToFunction(func.id)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedFunctions.length > 0 && availableFunctions.length > 0 && (
                  <div className="flex items-center gap-2 mt-4">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFunction(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">+ Adicionar função existente...</option>
                      {availableFunctions.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="w-80 flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Função Selecionada</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFunction ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: functions.find(f => f.id === selectedFunction)?.color }}
                      />
                      <span className="font-medium text-sm text-foreground">
                        {functions.find(f => f.id === selectedFunction)?.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getPrinciplesForFunction(selectedFunction).length} princípios cadastrados
                    </p>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMoveFunction(selectedFunction, 'up')}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMoveFunction(selectedFunction, 'down')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRemoveFunction(selectedFunction)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique em uma função na matriz para selecioná-la
                  </p>
                )}
              </CardContent>
            </Card>

            {selectedFunction && (
              <Card className="flex-1 min-h-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Princípios da Função</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {getPrinciplesForFunction(selectedFunction).map(p => (
                        <div 
                          key={p.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors",
                            conceptSelections[selectedFunction] === p.id 
                              ? "border-primary bg-primary/10" 
                              : "border-border hover:bg-accent"
                          )}
                          onClick={() => handleSelectPrinciple(selectedFunction, p.id)}
                        >
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.title} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">
                              {p.title.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm flex-1 truncate">{p.title}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => handleAddPrincipleToFunction(selectedFunction)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Princípio
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conceito em Formação</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(conceptSelections).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Selecione princípios na matriz para formar um conceito
                  </p>
                ) : (
                  <div className="space-y-2">
                    <ScrollArea className="h-32">
                      {Object.entries(conceptSelections).map(([funcId, principleId]) => {
                        const func = functions.find(f => f.id === funcId);
                        const principle = principles.find(p => p.id === principleId);
                        return (
                          <div key={funcId} className="flex items-center gap-2 text-xs py-1">
                            <Badge variant="outline" style={{ borderColor: func?.color }}>
                              {func?.name?.slice(0, 20)}...
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{principle?.title}</span>
                          </div>
                        );
                      })}
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setConceptModalOpen(true)}
                      >
                        Salvar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={clearSelections}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PrincipleModal
        open={principleModalOpen}
        onOpenChange={setPrincipleModalOpen}
        defaultFunctionId={searchFunctionId}
      />

      <PrincipleSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        functionId={searchFunctionId}
        onSelect={handlePrincipleSelected}
        onCreateNew={() => {
          setSearchModalOpen(false);
          setPrincipleModalOpen(true);
        }}
      />

      <ConceptSaveModal
        open={conceptModalOpen}
        onOpenChange={setConceptModalOpen}
        matrixId={matrixId || id || ''}
        selections={conceptSelections}
        onSaved={() => {
          setConceptSelections({});
        }}
      />

      <AIConceptGeneratorModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        functions={selectedFunctions}
        principles={principles}
        selections={conceptSelections}
        matrixId={matrixId || (id !== 'new' ? id : null) || null}
        onSaveConcept={(concept) => {
          const currentMatrixId = matrixId || (id !== 'new' ? id : null);
          if (currentMatrixId) {
            addConcept({
              name: concept.name,
              description: concept.description,
              matrixId: currentMatrixId,
              selections: concept.selections,
              generatedBy: concept.generatedBy
            });
            setConceptSelections({});
          }
        }}
      />
    </DashboardLayout>
  );
}
