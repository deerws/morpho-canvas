## Visão geral

Implementar gestão pedagógica completa do MorphoDesign com 3 papéis (Professor/Admin, Aluno matriculado, Espectador), gerenciamento de semestres (turmas), pré-cadastro de alunos por e-mail (manual ou via planilha), e regras de permissão que preservam o trabalho de outros alunos quando conteúdo de origem é editado/excluído.

---

## Conceitos centrais

**Papéis (`app_role`)**
- `admin` — Professor master. Cria/remove professores, turmas, alunos, exclui qualquer conteúdo.
- `teacher` — Professor regular. Mesmas permissões pedagógicas do admin (gerencia suas turmas e modera conteúdo).
- `student` — Aluno ativo numa turma. Cria/edita/exclui apenas seu próprio conteúdo.
- `viewer` — Espectador. Só lê. Não cria, não edita, não exclui.

**Turma/Semestre**
- Entidade nova `classes` (nome + semestre + professor responsável + status `active`/`closed`).
- Relação `class_enrollments` (aluno ↔ turma + papel naquela turma).
- Quando a turma é encerrada → todos os alunos viram `viewer` automaticamente. Professor também pode promover/rebaixar manualmente a qualquer momento.

**Pré-cadastro de alunos (`student_invitations`)**
- Professor cadastra e-mails (um a um ou via upload `.csv`/`.xlsx`) vinculados a uma turma.
- Tela de cadastro pública só permite criar conta se o e-mail estiver pré-autorizado.
- Ao confirmar conta, o aluno é matriculado automaticamente na turma do convite.

**Preservação de trabalho dos colegas (snapshot)**
- Quando um aluno usa um princípio/função numa célula de matriz ou num conceito, o sistema grava um *snapshot* dos campos chave (título, descrição, imagem, função associada) no próprio conceito/seleção.
- Se o autor original editar ou excluir depois, a matriz/conceito do colega continua exibindo o snapshot histórico ("daqui pra frente é assim").
- Visualmente, mostramos um indicador discreto "fonte original modificada/removida" quando aplicável.

---

## Master user inicial

Seed:
- E-mail: `prof.admin@admin.com`
- Senha: `admin123`
- Papel: `admin`
- E-mail auto-confirmado (sem necessidade de validação).

A partir dele é possível criar novos professores pela tela de gestão.

---

## Mudanças no banco de dados

**Enum `app_role`**: adicionar `viewer`. (já existe `admin`, `teacher`, `student`).

**Nova tabela `classes`**
- `id`, `name`, `semester` (ex: "2026.1"), `teacher_id` (uuid), `status` ('active'|'closed'), `created_at`, `closed_at`.

**Nova tabela `class_enrollments`**
- `id`, `class_id`, `user_id`, `enrolled_at`. Único por (class_id, user_id).

**Nova tabela `student_invitations`**
- `id`, `email` (lowercase), `class_id`, `invited_by`, `status` ('pending'|'accepted'), `created_at`, `accepted_at`. Único por (email, class_id).

**Trigger `handle_new_user` (atualizado)**
- Continua criando `profiles` e `user_roles`.
- Adicionalmente: se existir `student_invitation` `pending` para o e-mail, cria `class_enrollment`, marca convite como `accepted` e força papel `student` (ignora qualquer `role` enviado no signup público).
- Signup público sem convite é bloqueado por validação na borda (Edge Function ou checagem prévia).

**Função `close_class(class_id)`** (security definer)
- Atualiza `classes.status = 'closed'`, `closed_at = now()`.
- Para cada `user_id` matriculado: rebaixa role para `viewer` (somente se o usuário não tiver outra matrícula ativa em outra turma).

**Função helpers**
- `is_class_teacher(_user_id, _class_id)` — para policies.
- `current_active_role(_user_id)` — devolve o papel "efetivo" considerando matrículas.

**Snapshots**
- Coluna `selections_snapshot jsonb` em `concepts` (objeto `{ functionId: { principleTitle, principleDescription, principleImageUrl, functionName } }`).
- Hooks de criação/atualização de conceitos e matrizes preenchem o snapshot a partir das versões correntes.
- Leitura prefere o snapshot quando o registro original sumir/mudar.

**RLS atualizadas**
- `functions` / `principles` SELECT: permanece `is_public OR created_by = auth.uid()` (público por padrão, atende "tudo público + meu").
- `functions` / `principles` UPDATE/DELETE: `created_by = auth.uid()` **e papel ≠ viewer**, OU `has_role(auth.uid(), 'teacher'|'admin')`.
- `functions` / `principles` INSERT: `auth.uid() = created_by` **e papel ∈ (student, teacher, admin)** (viewer bloqueado).
- `concepts` INSERT/UPDATE/DELETE: dono da matriz **e papel ≠ viewer**, OU `teacher`/`admin`.
- `classes` / `class_enrollments` / `student_invitations`: somente `teacher`/`admin` lê e escreve; aluno só lê suas próprias matrículas.

---

## Mudanças no front-end

**Auth**
- `Register.tsx`: remover seletor "Tipo de usuário". Antes do `signUp`, chamar Edge Function `validate-invitation` que confirma se o e-mail está em `student_invitations` (status pending). Se não estiver → erro "E-mail não autorizado pelo professor".
- `useUserRole`: estender para retornar `isViewer`, `activeClass`, `isReadOnly` (true quando viewer).

**Nova página `Gestão` (apenas teacher/admin)** — `/management`
Acessível pelo sidebar. Três abas:

1. **Turmas**
   - Lista de turmas (nome, semestre, status, nº alunos).
   - Botão "Nova turma" (nome + semestre).
   - Ações por turma: ver alunos, encerrar (confirma e dispara `close_class`), reabrir.

2. **Alunos**
   - Selecionar turma → lista alunos matriculados + convites pendentes.
   - Botões: "Adicionar e-mail", "Importar planilha" (.csv/.xlsx; coluna `email`), "Remover aluno", "Promover a viewer / restaurar a aluno".
   - Importação: parse no client com SheetJS, validação Zod, envio em lote.

3. **Professores** (somente admin)
   - Listar usuários com papel `teacher`/`admin`.
   - "Adicionar professor" (envia convite especial; ao aceitar vira `teacher`).
   - "Remover papel de professor".

**Sidebar**
- Item "Gestão" só aparece para `teacher`/`admin`.

**Aplicação das permissões na UI**
- `FunctionsBank.tsx`, `Concepts.tsx`, `Matrices.tsx`, `MatrixEditor.tsx`: ocultar/desabilitar botões de criar/editar/excluir quando `isReadOnly` (viewer). Tooltip explicando "Modo somente leitura — semestre encerrado".
- Botões de exclusão de função/princípio ganham aviso: "X conceitos de outros alunos usam este item — eles continuarão funcionando com a versão atual em snapshot".

**Snapshots em conceitos**
- `useConcepts` ao salvar inclui `selections_snapshot` derivado do estado atual de funções/princípios.
- Ao renderizar um conceito antigo, comparar snapshot vs. dados atuais; se divergente, badge "Fonte original alterada".

**Indicação visual de papel**
- Sidebar footer: badge colorido ao lado do nome (Professor / Aluno / Espectador / Admin).

---

## Master user — como semear

Migração SQL que:
1. Insere usuário em `auth.users` via função admin (e-mail confirmado).
2. Insere `profiles` e `user_roles` (`admin`).
3. Idempotente (não duplica se já existir).

Após o primeiro login, recomendamos trocar a senha em **Configurações**.

---

## Detalhes técnicos

- **Importação de planilha**: usar `xlsx` (SheetJS) no client. Aceitar `.xlsx` e `.csv`. Coluna obrigatória: `email`. Coluna opcional: `name`. Validar com Zod (max 500 e-mails por upload).
- **Edge Function `validate-invitation`**: pública, recebe `email`, retorna `{ valid: boolean, classId?: string }`. Usa `service_role` para consultar `student_invitations` sem expor a tabela ao anon.
- **Edge Function `create-teacher`** (admin only): valida JWT do chamador, confere `admin`, insere usuário e atribui role `teacher`.
- **Snapshots**: `selections_snapshot` é uma cópia dos campos no momento da gravação. Migração de dados existentes preenche snapshot com o estado atual dos princípios referenciados.
- **Rebaixamento automático**: trigger em `classes` (AFTER UPDATE quando `status` muda para `closed`) chama `close_class()`.
- **Promoção manual**: endpoint via mutation que atualiza `user_roles.role` (apenas teacher/admin via RLS).
- **Auth settings**: manter auto-confirmação de e-mail ativada (já está no projeto) para fluxo simples de aluno via convite.

---

## Entregáveis

1. Migração SQL: enum `viewer`, tabelas `classes`/`class_enrollments`/`student_invitations`, trigger atualizado, função `close_class`, RLS revistas, coluna `selections_snapshot`, seed do master user.
2. Edge Functions: `validate-invitation`, `create-teacher`.
3. Hooks novos: `useClasses`, `useEnrollments`, `useInvitations`.
4. Páginas/componentes: `/management` (3 abas), modais (NewClass, AddStudents, ImportSpreadsheet, AddTeacher).
5. Atualizações: `Register.tsx`, `useUserRole.ts`, `AppSidebar.tsx`, `FunctionsBank.tsx`, `Concepts.tsx`, `MatrixEditor.tsx`, `Matrices.tsx`, `useConcepts.ts` (snapshots).
6. Atualização do `mem://autenticacao/niveis-acesso` e do README com diagrama do novo fluxo.

---

## O que NÃO entra agora

- Notificações por e-mail para convites (apenas marca convite como pending; aluno descobre que pode se cadastrar fora do app).
- Dashboard de métricas pedagógicas por turma (pode vir num próximo ciclo).
- Histórico/auditoria de moderação (quem excluiu o quê).
