import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Table2, Edit2, Trash2, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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

export default function Matrices() {
  const { matrices, deleteMatrix, isLoading } = useMatrices();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredMatrices = matrices.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteMatrix(deleteId);
      setDeleteId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Matrizes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas matrizes morfológicas
            </p>
          </div>
          <Button asChild>
            <Link to="/matrix/new">
              <Plus className="w-4 h-4 mr-2" />
              Nova Matriz
            </Link>
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar matriz..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMatrices.length === 0 ? (
          <Card className="py-16">
            <div className="text-center">
              <Table2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {search ? 'Nenhuma matriz encontrada' : 'Nenhuma matriz criada'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Tente outra busca' : 'Comece criando sua primeira matriz morfológica'}
              </p>
              {!search && (
                <Button asChild>
                  <Link to="/matrix/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeira matriz
                  </Link>
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMatrices.map((matrix) => (
              <Card key={matrix.id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Table2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to={`/matrix/${matrix.id}`}>
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setDeleteId(matrix.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to={`/matrix/${matrix.id}`} className="block group-hover:text-primary transition-colors">
                    <CardTitle className="text-lg mb-1">{matrix.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {matrix.description || 'Sem descrição'}
                    </CardDescription>
                  </Link>
                  <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <span>{matrix.functionIds.length} funções</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(matrix.createdAt)}</span>
                    </div>
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
              Tem certeza que deseja remover esta matriz? Esta ação não pode ser desfeita.
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
    </DashboardLayout>
  );
}
