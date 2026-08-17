import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import logo from '@/assets/logo.png';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type TeamOpt = { id: string; name: string; number: number };

export default function Register() {
  const navigate = useNavigate();
  const { signUp, user, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [requiresTeam, setRequiresTeam] = useState(false);
  const [emailCheck, setEmailCheck] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    if (user && !loading) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  // Live-checks whether the typed email is authorized by a teacher, as the user types.
  useEffect(() => {
    if (!z.string().email().safeParse(email).success) {
      setEmailCheck('idle');
      return;
    }
    setEmailCheck('checking');
    const timeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('validate-invitation', { body: { email } });
        if (error) throw error;
        setEmailCheck(data?.valid ? 'valid' : 'invalid');
      } catch {
        setEmailCheck('idle');
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    let resolvedTeamId: string | null = teamId || null;

    try {
      const { data: inv, error: invErr } = await supabase.functions.invoke(
        'validate-invitation',
        { body: { email } }
      );
      if (invErr) throw invErr;
      if (!inv?.valid) {
        toast.error(inv?.error || 'E-mail não autorizado pelo professor.');
        setIsLoading(false);
        return;
      }
      // First click: fetch teams and ask for selection before creating account
      if (inv.requiresTeamSelection && !teamId) {
        setTeams(inv.teams || []);
        setRequiresTeam(true);
        toast.info('Escolha sua equipe para continuar.');
        setIsLoading(false);
        return;
      }
      if (inv.teamId) resolvedTeamId = inv.teamId;
    } catch {
      toast.error('Não foi possível validar seu e-mail. Tente novamente.');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, name, 'student', { teamId: resolvedTeamId });

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
      setIsLoading(false);
      return;
    }

    toast.success('Conta criada com sucesso!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mb-4">
            <img src={logo} alt="MorphoDesign" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Apenas e-mails autorizados pelo professor podem criar conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setRequiresTeam(false); setTeams([]); setTeamId(''); }} className="pl-10 pr-10" required />
                {emailCheck === 'checking' && <Loader2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground animate-spin" />}
                {emailCheck === 'valid' && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-success" />}
                {emailCheck === 'invalid' && <XCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />}
              </div>
              {emailCheck === 'invalid' && (
                <p className="text-xs text-destructive">Este e-mail não foi autorizado por nenhum professor.</p>
              )}
              {emailCheck === 'valid' && (
                <p className="text-xs text-success">E-mail autorizado, pode continuar.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>

            {requiresTeam && (
              <div className="space-y-2">
                <Label>Equipe</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Escolha sua equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  O professor pode realocar você posteriormente.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || (requiresTeam && !teamId)}>
              {isLoading ? 'Criando conta...' : requiresTeam ? 'Confirmar e criar conta' : 'Criar conta'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Já tem uma conta? </span>
            <Link to="/login" className="text-primary hover:underline">Fazer login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
