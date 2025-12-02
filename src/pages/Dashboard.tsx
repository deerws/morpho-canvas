import { Link } from 'react-router-dom';
import { Plus, Table2, Lightbulb, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMorphoStore } from '@/store/morphoStore';

export default function Dashboard() {
  const { matrices, concepts, functions, principles, user } = useMorphoStore();

  const stats = [
    { title: 'Matrizes Criadas', value: matrices.length, icon: Table2, color: 'bg-primary' },
    { title: 'Conceitos Gerados', value: concepts.length, icon: Lightbulb, color: 'bg-secondary' },
    { title: 'Funções no Banco', value: functions.length, icon: TrendingUp, color: 'bg-warning' },
    { title: 'Princípios Cadastrados', value: principles.length, icon: Clock, color: 'bg-destructive' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Olá, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao MorphoDesign. Comece criando uma nova matriz morfológica.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link to="/matrix/new">
              <Plus className="w-5 h-5" />
              Nova Matriz
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-4 h-4 text-primary-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Matrizes Recentes</CardTitle>
              <CardDescription>Seus últimos projetos de matriz morfológica</CardDescription>
            </CardHeader>
            <CardContent>
              {matrices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Table2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma matriz criada ainda</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link to="/matrix/new">Criar primeira matriz</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {matrices.slice(0, 5).map((matrix) => (
                    <Link
                      key={matrix.id}
                      to={`/matrix/${matrix.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Table2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{matrix.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {matrix.functionIds.length} funções
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Acesse rapidamente as principais funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start gap-3">
                <Link to="/functions-bank">
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Banco de Funções</p>
                    <p className="text-xs text-muted-foreground">Gerenciar funções e princípios</p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-3">
                <Link to="/concepts">
                  <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-warning" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Conceitos Gerados</p>
                    <p className="text-xs text-muted-foreground">Visualizar conceitos salvos</p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-3">
                <Link to="/matrices">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Table2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Todas as Matrizes</p>
                    <p className="text-xs text-muted-foreground">Listar todas as matrizes</p>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
