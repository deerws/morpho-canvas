## Visão geral

Adicionar equipes dentro de cada turma. Professor define quantas equipes existem por turma; alunos escolhem a equipe no cadastro (e podem ser realocados pelo professor). Membros da mesma equipe veem e editam todas as matrizes e conceitos uns dos outros. Professor acompanha tudo via aba e dashboard.

---

## Modelo de dados

**Nova tabela `teams`**
- `id`, `class_id` (FK), `number` (int, 1..N), `name` (texto auto "Equipe N"), `created_at`. Único por (class_id, number).

**Nova coluna em `class_enrollments`**
- `team_id uuid` (nullable até o aluno escolher).

**Nova coluna em `student_invitations`**
- `team_id uuid` (nullable; só preenche se o professor pré-alocar; caso contrário aluno escolhe).

**Helpers SQL (security definer)**
- `get_user_team(_user_id)` → `team_id` ativo do usuário.
- `is_same_team(_user_id, _other_user_id)` → bool, true se ambos estão na mesma equipe ativa.
- `set_team_count(_class_id, _count)` — cria/remove equipes da turma até bater no count (não exclui equipes com membros sem confirmação).
- `move_student_to_team(_user_id, _team_id)` — apenas teacher/admin; valida que a equipe pertence à mesma turma.

**RLS atualizadas**
- `matrices`: SELECT/UPDATE/DELETE agora também permitidos quando `is_same_team(auth.uid(), user_id)`. INSERT continua dono.
- `concepts`: idem (via matriz do colega de equipe).
- Teacher/admin mantém acesso total.

**Trigger `handle_new_user` (ajuste)**
- Se o convite tiver `team_id`, grava `team_id` no `class_enrollments` criado.
- Senão, deixa `team_id` nulo; front pede escolha no cadastro.

---

## Front-end

**Cadastro (`Register.tsx`)**
- Após validar convite, chamar nova edge function `list-class-teams` (recebe email, devolve `{ classId, teams: [{id, name, number, memberCount}] }`).
- Se o convite já tem `team_id`, pula a etapa.
- Senão, mostra select obrigatório "Escolha sua equipe" antes do `signUp`. Equipe escolhida vai em `raw_user_meta_data.team_id` e o trigger usa esse valor (fallback do convite).

**Gestão → nova aba "Equipes"**
- Seleciona turma → mostra:
  - Input "Número de equipes" + botão Aplicar → chama `set_team_count`.
  - Lista de equipes em cards: nome, contagem de membros, lista de alunos com botão "Mover" (popover com selector de equipes da turma).
  - Linha "Sem equipe" com alunos pendentes para realocar.

**Gestão → nova aba "Acompanhamento" (dashboard)**
- Seleciona turma → tabela por aluno: nome, equipe, nº matrizes, nº conceitos, último acesso (do `profiles` se disponível, senão `updated_at` da última matriz). Agregado por equipe no topo (totais + médias).

**Sidebar / contexto do aluno**
- `useUserRole` ganha `teamId` e `teammateIds`.
- Em `Matrices.tsx`: além das "minhas matrizes", listar seção "Matrizes da equipe" com badge do autor. Mesma listagem em `Concepts.tsx`.
- `MatrixEditor.tsx`: se a matriz é de colega de equipe, libera edição e exibe banner discreto "Matriz de {nome} — equipe {N}".
- Viewer continua somente leitura (regra de role tem prioridade).

---

## Edge functions

- **`list-class-teams`** (público com service role): valida email convidado, retorna equipes da turma do convite + contagens.
- Atualizar **`validate-invitation`** para devolver também `requiresTeamSelection: boolean` e `teamId` quando pré-alocado.

---

## Detalhes técnicos

- Equipes são auto-nomeadas `Equipe N`. Se o professor reduzir a quantidade, equipes com membros são bloqueadas (RAISE EXCEPTION explicando que precisa esvaziar antes).
- `is_same_team` usa apenas matrículas em turmas com `status='active'` para não vazar acesso após encerramento.
- Hooks novos: `useTeams(classId)`, `useTeammates()`, `useClassProgress(classId)`.
- React Query: invalidar `['matrices']`/`['concepts']` quando `team_id` do aluno muda.
- Sem alteração de cores/identidade visual.

---

## Entregáveis

1. Migração: tabela `teams`, colunas `team_id`, RLS revisadas, funções helpers, trigger atualizado.
2. Edge functions: `list-class-teams`, atualização de `validate-invitation`.
3. Hooks: `useTeams`, `useTeammates`, `useClassProgress`.
4. UI: aba "Equipes" e "Acompanhamento" em `/management`; ajustes em `Register.tsx`, `Matrices.tsx`, `Concepts.tsx`, `MatrixEditor.tsx`, `useUserRole.ts`.
5. Atualização das memórias de RBAC e do README com diagrama do fluxo de equipes.

## Fora do escopo agora

- Chat/comentários dentro da equipe.
- Histórico de quem editou o quê (auditoria).
- Notificação por e-mail quando o professor realoca o aluno.
