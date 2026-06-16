import { useState } from 'react';
import { Plus, Trash2, Lock, Unlock, Mail, Upload, UserMinus, Eye, GraduationCap, Loader2, Users, BarChart3, ArrowRightLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { useClasses } from '@/hooks/useClasses';
import { useClassMembers } from '@/hooks/useClassMembers';
import { useTeams } from '@/hooks/useTeams';
import { useClassProgress } from '@/hooks/useClassProgress';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function Management() {
  const { user } = useAuth();
  const { isTeacher, isAdmin, isLoading: loadingRole } = useUserRole();
  const { classes, isLoading, createClass, closeClass, reopenClass, deleteClass } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  if (loadingRole) {
    return <DashboardLayout><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }
  if (!isTeacher) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão Pedagógica</h1>
          <p className="text-muted-foreground mt-1">Turmas, alunos e professores</p>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList>
            <TabsTrigger value="classes">Turmas</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="teams"><Users className="w-4 h-4 mr-1" />Equipes</TabsTrigger>
            <TabsTrigger value="progress"><BarChart3 className="w-4 h-4 mr-1" />Acompanhamento</TabsTrigger>
            {isAdmin && <TabsTrigger value="teachers">Professores</TabsTrigger>}
          </TabsList>

          <TabsContent value="classes" className="space-y-4">
            <ClassesTab
              classes={classes}
              isLoading={isLoading}
              onCreate={createClass}
              onClose={closeClass}
              onReopen={reopenClass}
              onDelete={deleteClass}
              onSelect={(id) => setSelectedClassId(id)}
            />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <StudentsTab
              classes={classes}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
              userId={user?.id}
            />
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <TeamsTab
              classes={classes}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <ProgressTab
              classes={classes}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="teachers" className="space-y-4">
              <TeachersTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ClassesTab({
  classes, isLoading, onCreate, onClose, onReopen, onDelete, onSelect,
}: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string } | null>(null);

  const submit = () => {
    if (!name.trim() || !semester.trim()) return toast.error('Preencha todos os campos');
    onCreate({ name: name.trim(), semester: semester.trim() });
    setName(''); setSemester(''); setOpen(false);
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova turma</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova turma</DialogTitle>
              <DialogDescription>Crie uma turma vinculada a um semestre.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Design de Produto" /></div>
              <div><Label>Semestre</Label><Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="2026.1" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : classes.length === 0 ? (
        <Card className="py-12"><div className="text-center text-muted-foreground">Nenhuma turma criada</div></Card>
      ) : (
        <div className="grid gap-3">
          {classes.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1 cursor-pointer" onClick={() => onSelect(c.id)}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{c.name}</h3>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                      {c.status === 'active' ? 'Ativa' : 'Encerrada'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Semestre {c.semester}</p>
                </div>
                <div className="flex gap-2">
                  {c.status === 'active' ? (
                    <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'close', id: c.id })}>
                      <Lock className="w-4 h-4 mr-1" />Encerrar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onReopen(c.id)}>
                      <Unlock className="w-4 h-4 mr-1" />Reabrir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'delete', id: c.id })}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'close' ? 'Encerrar turma' : 'Excluir turma'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'close'
                ? 'Todos os alunos da turma serão rebaixados a Espectadores. Eles continuarão vendo seu trabalho mas não poderão criar mais conteúdo.'
                : 'Isso remove a turma e todas as matrículas. O conteúdo dos alunos é preservado, mas eles podem ficar sem turma ativa.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction?.type === 'close') onClose(confirmAction.id);
                else onDelete(confirmAction!.id);
                setConfirmAction(null);
              }}
            >Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StudentsTab({ classes, selectedClassId, setSelectedClassId, userId }: any) {
  const { members, invitations, isLoading, addInvitations, removeInvitation, removeMember, setStudentRole } = useClassMembers(selectedClassId);
  const [emailsText, setEmailsText] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const parseEmails = (text: string): string[] => {
    return Array.from(new Set(
      text.split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    ));
  };

  const handleAdd = () => {
    const emails = parseEmails(emailsText);
    if (!emails.length) return toast.error('Nenhum e-mail válido');
    if (!selectedClassId || !userId) return;
    addInvitations({ emails, classId: selectedClassId, invitedBy: userId });
    setEmailsText(''); setAddOpen(false);
  };

  const handleFile = async (file: File) => {
    if (!selectedClassId || !userId) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      const flat = rows.flat().map((v) => String(v || ''));
      const emails = parseEmails(flat.join('\n'));
      if (!emails.length) return toast.error('Nenhum e-mail válido encontrado na planilha');
      if (emails.length > 500) return toast.error('Máximo 500 e-mails por upload');
      addInvitations({ emails, classId: selectedClassId, invitedBy: userId });
    } catch {
      toast.error('Não foi possível ler a planilha');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm">Turma:</Label>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedClassId || ''}
          onChange={(e) => setSelectedClassId(e.target.value || null)}
        >
          <option value="">Selecione…</option>
          {classes.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name} — {c.semester}</option>
          ))}
        </select>

        {selectedClassId && (
          <>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Mail className="w-4 h-4 mr-2" />Adicionar e-mails</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar alunos</DialogTitle>
                  <DialogDescription>Cole um ou mais e-mails (separados por vírgula, espaço ou linha).</DialogDescription>
                </DialogHeader>
                <Textarea rows={6} value={emailsText} onChange={(e) => setEmailsText(e.target.value)} placeholder="aluno1@email.com, aluno2@email.com" />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAdd}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Label htmlFor="upload" className="cursor-pointer">
              <div className="inline-flex items-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-sm">
                <Upload className="w-4 h-4 mr-2" />Importar planilha
              </div>
              <input
                id="upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </Label>
          </>
        )}
      </div>

      {!selectedClassId ? (
        <Card className="py-12"><div className="text-center text-muted-foreground">Selecione uma turma para gerenciar alunos</div></Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Matriculados ({members.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</p>
              ) : members.map((m: any) => (
                <div key={m.enrollmentId} className="flex items-center justify-between border border-border rounded-md p-3">
                  <div>
                    <p className="font-medium text-foreground text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === 'viewer' ? 'secondary' : 'default'}>
                      {m.role === 'viewer' ? 'Espectador' : m.role === 'student' ? 'Aluno' : m.role}
                    </Badge>
                    {m.role === 'student' ? (
                      <Button size="sm" variant="outline" onClick={() => setStudentRole({ userId: m.userId, role: 'viewer' })}>
                        <Eye className="w-3 h-3 mr-1" />Tornar espectador
                      </Button>
                    ) : m.role === 'viewer' ? (
                      <Button size="sm" variant="outline" onClick={() => setStudentRole({ userId: m.userId, role: 'student' })}>
                        <GraduationCap className="w-3 h-3 mr-1" />Tornar aluno
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => removeMember(m.enrollmentId)}>
                      <UserMinus className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Convites pendentes ({invitations.filter((i: any) => i.status === 'pending').length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {invitations.filter((i: any) => i.status === 'pending').length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
              ) : invitations.filter((i: any) => i.status === 'pending').map((i: any) => (
                <div key={i.id} className="flex items-center justify-between border border-dashed border-border rounded-md p-3">
                  <p className="text-sm">{i.email}</p>
                  <Button size="sm" variant="ghost" onClick={() => removeInvitation(i.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function TeachersTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const teachers = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['teacher', 'admin']);
      if (error) throw error;
      const ids = (roles || []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from('profiles').select('id, name, email').in('id', ids);
      return (roles || []).map((r) => ({
        ...r,
        profile: profs?.find((p) => p.id === r.user_id),
      }));
    },
  });

  const create = async () => {
    if (!email || password.length < 6) return toast.error('E-mail e senha (mínimo 6) obrigatórios');
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('create-teacher', {
      body: { email, password, name },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao criar professor');
      return;
    }
    toast.success('Professor criado');
    setOpen(false); setEmail(''); setPassword(''); setName('');
    qc.invalidateQueries({ queryKey: ['teachers'] });
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo professor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar professor</DialogTitle>
              <DialogDescription>Cria um novo professor com acesso administrativo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Senha temporária</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {(teachers.data || []).map((t: any) => (
          <Card key={t.user_id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">{t.profile?.name || '—'}</p>
                <p className="text-sm text-muted-foreground">{t.profile?.email}</p>
              </div>
              <Badge variant={t.role === 'admin' ? 'default' : 'secondary'}>
                {t.role === 'admin' ? 'Admin' : 'Professor'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function ClassPicker({ classes, selectedClassId, setSelectedClassId }: any) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Label className="text-sm">Turma:</Label>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={selectedClassId || ''}
        onChange={(e) => setSelectedClassId(e.target.value || null)}
      >
        <option value="">Selecione…</option>
        {classes.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name} — {c.semester}</option>
        ))}
      </select>
    </div>
  );
}

function TeamsTab({ classes, selectedClassId, setSelectedClassId }: any) {
  const { teams, isLoading, setTeamCount, moveStudent } = useTeams(selectedClassId);
  const { members } = useClassMembers(selectedClassId);
  const [countInput, setCountInput] = useState<string>('');

  const handleApply = () => {
    const n = parseInt(countInput, 10);
    if (Number.isNaN(n) || n < 0) return toast.error('Digite um número válido');
    if (!selectedClassId) return;
    setTeamCount({ classId: selectedClassId, count: n });
    setCountInput('');
  };

  const unassigned = members.filter((m: any) => !m.teamId);

  return (
    <div className="space-y-4">
      <ClassPicker classes={classes} selectedClassId={selectedClassId} setSelectedClassId={setSelectedClassId} />

      {!selectedClassId ? (
        <Card className="py-12"><div className="text-center text-muted-foreground">Selecione uma turma</div></Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quantidade de equipes</CardTitle>
              <CardDescription>
                Atual: {teams.length}. Aumentar adiciona equipes "Equipe N". Diminuir só funciona se as últimas estiverem vazias.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2 items-end">
              <div className="space-y-1">
                <Label>Nova quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  className="w-32"
                  placeholder={String(teams.length)}
                />
              </div>
              <Button onClick={handleApply}>Aplicar</Button>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {teams.map((team: any) => {
                const teamMembers = members.filter((m: any) => m.teamId === team.id);
                return (
                  <Card key={team.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{team.name}</span>
                        <Badge variant="secondary">{teamMembers.length} membro(s)</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem membros.</p>
                      ) : teamMembers.map((m: any) => (
                        <MemberRow key={m.userId} member={m} teams={teams} onMove={(tid) => moveStudent({ userId: m.userId, teamId: tid })} />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

              {unassigned.length > 0 && (
                <Card className="md:col-span-2 border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Sem equipe ({unassigned.length})</CardTitle>
                    <CardDescription>Alunos matriculados que ainda não estão em nenhuma equipe.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {unassigned.map((m: any) => (
                      <MemberRow key={m.userId} member={m} teams={teams} onMove={(tid) => moveStudent({ userId: m.userId, teamId: tid })} />
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberRow({ member, teams, onMove }: any) {
  return (
    <div className="flex items-center justify-between border border-border rounded-md p-2">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
        <Select value={member.teamId || 'none'} onValueChange={(v) => onMove(v === 'none' ? null : v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Equipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem equipe</SelectItem>
            {teams.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ProgressTab({ classes, selectedClassId, setSelectedClassId }: any) {
  const { data: rows = [], isLoading } = useClassProgress(selectedClassId);

  const grouped: Record<string, { name: string; students: typeof rows }> = {};
  for (const r of rows) {
    const key = r.teamId || 'none';
    const label = r.teamName || 'Sem equipe';
    if (!grouped[key]) grouped[key] = { name: label, students: [] };
    grouped[key].students.push(r);
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  return (
    <div className="space-y-4">
      <ClassPicker classes={classes} selectedClassId={selectedClassId} setSelectedClassId={setSelectedClassId} />

      {!selectedClassId ? (
        <Card className="py-12"><div className="text-center text-muted-foreground">Selecione uma turma</div></Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="py-12"><div className="text-center text-muted-foreground">Sem alunos matriculados.</div></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, g]) => {
            const totalM = g.students.reduce((a, s) => a + s.matricesCount, 0);
            const totalC = g.students.reduce((a, s) => a + s.conceptsCount, 0);
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{g.name}</span>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="secondary">{g.students.length} aluno(s)</Badge>
                      <Badge variant="outline">{totalM} matrizes</Badge>
                      <Badge variant="outline">{totalC} conceitos</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="py-2 px-2 font-medium">Aluno</th>
                          <th className="py-2 px-2 font-medium text-center">Matrizes</th>
                          <th className="py-2 px-2 font-medium text-center">Conceitos</th>
                          <th className="py-2 px-2 font-medium">Última atividade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.students.map((s) => (
                          <tr key={s.userId} className="border-b last:border-0">
                            <td className="py-2 px-2">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-muted-foreground">{s.email}</div>
                            </td>
                            <td className="py-2 px-2 text-center">{s.matricesCount}</td>
                            <td className="py-2 px-2 text-center">{s.conceptsCount}</td>
                            <td className="py-2 px-2 text-xs text-muted-foreground">{formatDate(s.lastActivity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

