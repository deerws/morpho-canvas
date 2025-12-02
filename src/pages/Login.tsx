import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMorphoStore } from '@/store/morphoStore';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useMorphoStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Demo login - in production, this would validate against backend
    setTimeout(() => {
      if (email && password) {
        setUser({
          id: 'demo-user',
          name: email.split('@')[0],
          email,
          role: 'student',
        });
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      } else {
        toast.error('Por favor, preencha todos os campos');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Table2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">MorphoDesign</CardTitle>
          <CardDescription>
            Plataforma de Matriz Morfológica para Design de Produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <Link to="/register" className="text-primary hover:underline">
              Cadastrar nova conta
            </Link>
            <span className="mx-2 text-muted-foreground">•</span>
            <Link to="/forgot-password" className="text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
