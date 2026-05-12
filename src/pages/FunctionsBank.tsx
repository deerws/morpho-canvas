import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useFunctions, ProductFunction } from '@/hooks/useFunctions';
import { usePrinciples, Principle } from '@/hooks/usePrinciples';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { FunctionModal } from '@/components/modals/FunctionModal';
import { PrincipleModal } from '@/components/modals/PrincipleModal';
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
import { supabase } from '@/integrations/supabase/client';

export default function FunctionsBank() {
  const { functions, deleteFunction, isLoading: loadingFunctions } = useFunctions();
  const { user } = useAuth();
  const { isTeacher, isViewer } = useUserRole();
  const { principles, deletePrinciple, isLoading: loadingPrinciples } = usePrinciples();
  const [searchFunction, setSearchFunction] = useState('');
  const [searchPrinciple, setSearchPrinciple] = useState('');
  const [filterFunction, setFilterFunction] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [functionModalOpen, setFunctionModalOpen] = useState(false);
  const [principleModalOpen, setPrincipleModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<ProductFunction | undefined>();
  const [editingPrinciple, setEditingPrinciple] = useState<Principle | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'function' | 'principle'; id: string } | null>(null);
  const [othersUsageCount, setOthersUsageCount] = useState<number>(0);
  const [checkingUsage, setCheckingUsage] = useState(false);

  const categories: ProductFunction['category'][] = ['Mecânica', 'Elétrica', 'Térmica', 'Hidráulica', 'Química', 'Outra'];

  const filteredFunctions = functions.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchFunction.toLowerCase());
    const matchesCategory = filterCategory === 'all' || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPrinciples = principles.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchPrinciple.toLowerCase()) ||
      p.description.toLowerCase().includes(searchPrinciple.toLowerCase());
    const matchesFilter = filterFunction === 'all' || p.functionId === filterFunction;
    return matchesSearch && matchesFilter;
  });

  const handleEditFunction = (func: ProductFunction) => {
    setEditingFunction(func);
    setFunctionModalOpen(true);
  };

  const handleEditPrinciple = (principle: Principle) => {
    setEditingPrinciple(principle);
    setPrincipleModalOpen(true);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'function') {
      deleteFunction(itemToDelete.id);
    } else {
      deletePrinciple(itemToDelete.id);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const confirmDelete = async (type: 'function' | 'principle', id: string) => {
    setItemToDelete({ type, id });
    setOthersUsageCount(0);
    setDeleteDialogOpen(true);
    setCheckingUsage(true);
    try {
      // Buscar conceitos (com matriz) que referenciam o item
      const { data: rows, error } = await supabase
        .from('concepts')
        .select('id, selections, selections_snapshot, matrices!inner(user_id)');
      if (error) throw error;
      let count = 0;
      for (const row of rows || []) {
        const ownerId = (row as any).matrices?.user_id;
        if (!ownerId || ownerId === user?.id) continue;
        const sel = (row.selections || {}) as Record<string, string>;
        const snap = (row.selections_snapshot || {}) as Record<string, any>;
        let referenced = false;
        if (type === 'function') {
          if (sel[id] !== undefined) referenced = true;
          if (!referenced && snap[id]) referenced = true;
        } else {
          if (Object.values(sel).includes(id)) referenced = true;
          if (!referenced) {
            for (const entry of Object.values(snap)) {
              if (entry && (entry as any).principleId === id) { referenced = true; break; }
            }
          }
        }
        if (referenced) count++;
      }
      setOthersUsageCount(count);
    } catch {
      setOthersUsageCount(0);
    } finally {
      setCheckingUsage(false);
    }
  };

  const getPrincipleCount = (functionId: string) => 
    principles.filter(p => p.functionId === functionId).length;

  const getFunctionName = (functionId: string) =>
    functions.find(f => f.id === functionId)?.name || 'Sem função';

  const getFunctionColor = (functionId: string) =>
    functions.find(f => f.id === functionId)?.color || '#6b7280';

  const isLoading = loadingFunctions || loadingPrinciples;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Banco de Funções</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie funções e princípios de solução para suas matrizes
          </p>
        </div>

        <Tabs defaultValue="functions" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="functions">Funções Cadastradas</TabsTrigger>
            <TabsTrigger value="principles">Princípios de Solução</TabsTrigger>
          </TabsList>

          <TabsContent value="functions" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar função..."
                  value={searchFunction}
                  onChange={(e) => setSearchFunction(e.target.value)}
                  className="pl-10"
                />
              </div>
              {!isViewer && (
                <Button onClick={() => { setEditingFunction(undefined); setFunctionModalOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Função
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredFunctions.length === 0 ? (
                <Card className="py-12">
                  <div className="text-center text-muted-foreground">
                    <p>Nenhuma função encontrada</p>
                  </div>
                </Card>
              ) : (
                filteredFunctions.map((func) => (
                  <Card key={func.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-4 h-12 rounded-full"
                          style={{ backgroundColor: func.color }}
                        />
                        <div>
                          <h3 className="font-medium text-foreground">{func.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {func.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {getPrincipleCount(func.id)} princípios associados
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(isTeacher || func.createdBy === user?.id) && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditFunction(func)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {(isTeacher || func.createdBy === user?.id) && (
                          <Button variant="ghost" size="sm" onClick={() => confirmDelete('function', func.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        {func.createdBy !== user?.id && !isTeacher && (
                          <Badge variant="outline" className="text-xs">Público</Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="principles" className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar princípio..."
                  value={searchPrinciple}
                  onChange={(e) => setSearchPrinciple(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterFunction}
                onChange={(e) => setFilterFunction(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Todas as funções</option>
                {functions.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {!isViewer && (
                <Button onClick={() => { setEditingPrinciple(undefined); setPrincipleModalOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Princípio
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <div className="flex justify-center py-12 col-span-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPrinciples.length === 0 ? (
                <Card className="py-12 col-span-full">
                  <div className="text-center text-muted-foreground">
                    <p>Nenhum princípio encontrado</p>
                  </div>
                </Card>
              ) : (
                filteredPrinciples.map((principle) => (
                  <Card key={principle.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    {principle.imageUrl ? (
                      <div className="aspect-video bg-muted">
                        <img
                          src={principle.imageUrl}
                          alt={principle.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-2xl font-bold text-muted-foreground/50">
                          {principle.title.charAt(0)}
                        </span>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{principle.title}</CardTitle>
                        {(isTeacher || principle.createdBy === user?.id) && (
                          <div className="flex gap-1">
                            {(isTeacher || principle.createdBy === user?.id) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPrinciple(principle)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                            {(isTeacher || principle.createdBy === user?.id) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => confirmDelete('principle', principle.id)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        style={{ borderColor: getFunctionColor(principle.functionId), color: getFunctionColor(principle.functionId) }}
                      >
                        {getFunctionName(principle.functionId)}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2">
                        {principle.description}
                      </CardDescription>
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span>Usado {principle.usageCount}x</span>
                        <span>Custo: {principle.cost}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <FunctionModal
        open={functionModalOpen}
        onOpenChange={setFunctionModalOpen}
        editingFunction={editingFunction}
      />

      <PrincipleModal
        open={principleModalOpen}
        onOpenChange={setPrincipleModalOpen}
        editingPrinciple={editingPrinciple}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {othersUsageCount > 0 ? 'Atenção: item em uso por outros alunos' : 'Confirmar exclusão'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {checkingUsage ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verificando uso por outros alunos…</span>
              ) : othersUsageCount > 0 ? (
                <>
                  <strong>{othersUsageCount}</strong> {othersUsageCount === 1 ? 'conceito de outro aluno usa' : 'conceitos de outros alunos usam'} este {itemToDelete?.type === 'function' ? 'função' : 'princípio'}.
                  Eles continuarão funcionando com a versão em snapshot, mas o item desaparecerá do banco para novos usos. Deseja continuar?
                </>
              ) : (
                <>Tem certeza que deseja remover {itemToDelete?.type === 'function' ? 'esta função' : 'este princípio'}? Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={checkingUsage} className="bg-destructive text-destructive-foreground">
              {othersUsageCount > 0 ? 'Excluir mesmo assim' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
