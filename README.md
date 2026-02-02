# MorphoDesign Platform (Morpho Canvas)

Uma plataforma web educativa para estudantes e professores de design de produto criarem, gerenciarem e analisarem **matrizes morfológicas**. O sistema moderniza fluxos de trabalho legados com uma interface interativa focada em usabilidade acadêmica.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-teal)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Banco de Dados](#-banco-de-dados)
- [Geração de Conceitos com IA](#-geração-de-conceitos-com-ia)
- [Contribuição](#-contribuição)

## 🎯 Sobre o Projeto

### O que é Matriz Morfológica?

A **matriz morfológica** é uma técnica de criatividade e resolução de problemas desenvolvida por Fritz Zwicky. Ela permite explorar sistematicamente todas as combinações possíveis de soluções para um problema de design, organizando:

- **Funções**: Os problemas ou requisitos que precisam ser resolvidos
- **Princípios de Solução**: As diferentes formas de resolver cada função

### Objetivo da Plataforma

O MorphoDesign Platform foi desenvolvido para:

1. **Digitalizar** o processo de criação de matrizes morfológicas
2. **Facilitar** a colaboração entre estudantes e professores
3. **Automatizar** a geração de conceitos usando Inteligência Artificial
4. **Organizar** bancos de funções e princípios reutilizáveis
5. **Avaliar** conceitos com métricas de custo, complexidade e viabilidade

## ✨ Funcionalidades

### 🔐 Autenticação
- Login e registro com email
- Sistema de roles (admin, teacher, student)
- Perfis de usuário personalizáveis

### 📊 Dashboard
- Visão geral das matrizes criadas
- Acesso rápido a conceitos salvos
- Estatísticas de uso

### 🗂️ Banco de Funções
- Catálogo de funções organizadas por categoria:
  - Mecânica
  - Elétrica
  - Térmica
  - Hidráulica
  - Química
  - Outra
- Funções públicas (sistema) e privadas (usuário)
- Busca e filtros avançados

### 🧩 Princípios de Solução
- Princípios vinculados a cada função
- Imagens ilustrativas
- Métricas de complexidade e custo
- Tags para organização
- Sistema de busca inteligente

### 📐 Matrizes Morfológicas
- Criação visual de matrizes
- Seleção de funções e princípios
- Organização drag-and-drop
- Exportação de dados

### 🤖 Geração de Conceitos com IA
- Integração com Google Gemini 1.5 Flash
- Parâmetros configuráveis:
  - Nível de criatividade
  - Foco (inovação, viabilidade, custo)
  - Número de conceitos
- Sistema de cache para otimização
- Pontuação e justificativa detalhada
- Coleta de feedback do usuário

### 💾 Conceitos
- Salvamento de combinações geradas
- Marcação manual ou por IA
- Histórico de conceitos por matriz

## 🛠️ Tecnologias Utilizadas

### Frontend

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **React** | 18.3 | Biblioteca para construção de interfaces |
| **TypeScript** | 5.x | Superset tipado de JavaScript |
| **Vite** | 5.x | Build tool e dev server rápido |
| **Tailwind CSS** | 3.4 | Framework CSS utility-first |
| **shadcn/ui** | - | Componentes de UI acessíveis |
| **React Router** | 6.x | Roteamento client-side |
| **React Query** | 5.x | Gerenciamento de estado do servidor |
| **Zustand** | 5.x | Gerenciamento de estado global |
| **React Hook Form** | 7.x | Formulários performáticos |
| **Zod** | 3.x | Validação de schemas |
| **Lucide React** | - | Biblioteca de ícones |
| **Recharts** | 2.x | Gráficos e visualizações |
| **Sonner** | 1.x | Notificações toast |

### Backend (Supabase/Lovable Cloud)

| Tecnologia | Descrição |
|------------|-----------|
| **PostgreSQL** | Banco de dados relacional |
| **Supabase Auth** | Autenticação e autorização |
| **Supabase Storage** | Armazenamento de arquivos |
| **Edge Functions** | Funções serverless (Deno) |
| **Row Level Security** | Segurança a nível de linha |

### Inteligência Artificial

| Tecnologia | Descrição |
|------------|-----------|
| **Google Gemini 1.5 Flash** | Modelo de linguagem para geração de conceitos |

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │  React  │  │ Router  │  │  Query  │  │  Zustand Store  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
│       │            │            │                 │          │
│       └────────────┴────────────┴─────────────────┘          │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Supabase SDK   │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                      Backend (Supabase)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │  Auth   │  │PostgreSQL│  │ Storage │  │ Edge Functions  │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┬────────┘ │
│                                                   │          │
└───────────────────────────────────────────────────┼──────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │  Google Gemini  │
                                           │     API         │
                                           └─────────────────┘
```

## 🚀 Instalação

### Pré-requisitos

- **Node.js** 18+ 
- **npm** ou **bun**
- Conta no [Lovable](https://lovable.dev) (para backend)

### Instalação Local

1. **Clone o repositório**
```bash
git clone <URL_DO_REPOSITORIO>
cd morpho-canvas
```

2. **Instale as dependências**
```bash
npm install
# ou
bun install
```

3. **Configure as variáveis de ambiente**

O projeto usa Lovable Cloud, que configura automaticamente as variáveis:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Para a geração de conceitos com IA, configure:
- `GOOGLE_GENERATIVE_AI_API_KEY` (nas secrets do projeto)

4. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
# ou
bun run dev
```

5. **Acesse a aplicação**
```
http://localhost:5173
```

### Usando o Lovable

A forma mais simples de usar o projeto é através do Lovable:

1. Acesse o [Projeto no Lovable](https://lovable.dev/projects/c0dfbbfd-34e1-493c-ad1d-9189babcf066)
2. Use o chat para fazer alterações
3. Visualize as mudanças em tempo real

## 📁 Estrutura de Pastas

```
morpho-canvas/
├── public/                    # Arquivos estáticos
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── components/            # Componentes React
│   │   ├── layout/           # Componentes de layout
│   │   │   ├── AppSidebar.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── modals/           # Modais da aplicação
│   │   │   ├── AIConceptGeneratorModal.tsx
│   │   │   ├── ConceptSaveModal.tsx
│   │   │   ├── FunctionModal.tsx
│   │   │   ├── PrincipleModal.tsx
│   │   │   └── PrincipleSearchModal.tsx
│   │   └── ui/               # Componentes shadcn/ui
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.tsx       # Autenticação
│   │   ├── useConcepts.ts    # CRUD de conceitos
│   │   ├── useFunctions.ts   # CRUD de funções
│   │   ├── useMatrices.ts    # CRUD de matrizes
│   │   ├── usePrinciples.ts  # CRUD de princípios
│   │   ├── useImageUpload.ts # Upload de imagens
│   │   └── useAIConceptGeneration.ts
│   ├── integrations/         # Integrações externas
│   │   └── supabase/
│   │       ├── client.ts     # Cliente Supabase
│   │       └── types.ts      # Tipos do banco
│   ├── pages/                # Páginas da aplicação
│   │   ├── Index.tsx         # Landing page
│   │   ├── Login.tsx         # Página de login
│   │   ├── Register.tsx      # Página de registro
│   │   ├── Dashboard.tsx     # Dashboard principal
│   │   ├── Matrices.tsx      # Lista de matrizes
│   │   ├── MatrixEditor.tsx  # Editor de matriz
│   │   ├── Concepts.tsx      # Conceitos salvos
│   │   ├── FunctionsBank.tsx # Banco de funções
│   │   ├── Settings.tsx      # Configurações
│   │   └── NotFound.tsx      # Página 404
│   ├── store/                # Estado global (Zustand)
│   │   └── morphoStore.ts
│   ├── types/                # Definições de tipos
│   │   └── morpho.ts
│   ├── lib/                  # Utilitários
│   │   └── utils.ts
│   ├── App.tsx               # Componente raiz
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globais e design tokens
├── supabase/
│   ├── config.toml           # Configuração Supabase
│   ├── functions/            # Edge Functions
│   │   └── generate-concepts/
│   │       └── index.ts      # Geração de conceitos IA
│   └── migrations/           # Migrações do banco
├── tailwind.config.ts        # Configuração Tailwind
├── vite.config.ts            # Configuração Vite
├── tsconfig.json             # Configuração TypeScript
└── package.json              # Dependências
```

## 🗄️ Banco de Dados

### Diagrama ER

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    profiles     │     │    functions    │     │   principles    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │◄────│ function_id(FK) │
│ user_id         │     │ name            │     │ id (PK)         │
│ name            │     │ description     │     │ title           │
│ email           │     │ category        │     │ description     │
│ avatar_url      │     │ color           │     │ image_url       │
│ created_at      │     │ is_public       │     │ complexity      │
│ updated_at      │     │ created_by      │     │ cost            │
└─────────────────┘     │ created_at      │     │ tags            │
                        │ updated_at      │     │ is_public       │
┌─────────────────┐     └─────────────────┘     │ created_by      │
│   user_roles    │                             │ usage_count     │
├─────────────────┤                             │ created_at      │
│ id (PK)         │                             │ updated_at      │
│ user_id         │                             └─────────────────┘
│ role            │
└─────────────────┘     ┌─────────────────┐     ┌─────────────────┐
                        │    matrices     │     │    concepts     │
                        ├─────────────────┤     ├─────────────────┤
                        │ id (PK)         │◄────│ matrix_id (FK)  │
                        │ name            │     │ id (PK)         │
                        │ description     │     │ name            │
                        │ function_ids    │     │ description     │
                        │ user_id         │     │ selections      │
                        │ created_at      │     │ generated_by    │
                        │ updated_at      │     │ created_at      │
                        └─────────────────┘     └─────────────────┘

┌─────────────────────┐
│  ai_concept_cache   │
├─────────────────────┤
│ id (PK)             │
│ user_id             │
│ selections_hash     │
│ selections          │
│ options             │
│ concepts            │
│ created_at          │
│ expires_at          │
└─────────────────────┘
```

### Enums

| Enum | Valores |
|------|---------|
| `app_role` | admin, teacher, student |
| `function_category` | Mecânica, Elétrica, Térmica, Hidráulica, Química, Outra |
| `cost_level` | Baixo, Médio, Alto |
| `concept_generated_by` | manual, ia |

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS para:
- Usuários podem ver dados públicos (`is_public = true`)
- Usuários podem ver/editar seus próprios dados
- Administradores têm acesso completo

## 🤖 Geração de Conceitos com IA

### Como Funciona

1. **Entrada**: O usuário seleciona princípios na matriz morfológica
2. **Configuração**: Define parâmetros (criatividade, foco, quantidade)
3. **Processamento**: Edge Function envia para Google Gemini
4. **Cache**: Resultados são cacheados por hash das seleções
5. **Saída**: Conceitos com nome, descrição, pontuação e justificativa

### Parâmetros

| Parâmetro | Descrição | Valores |
|-----------|-----------|---------|
| Criatividade | Nível de inovação das respostas | 0.1 - 1.0 |
| Foco | Prioridade da geração | Inovação, Viabilidade, Custo |
| Quantidade | Número de conceitos | 1 - 10 |

### Sistema de Cache

Para otimizar custos e performance, um sistema de cache baseado no hash das seleções e configurações evita chamadas redundantes à API do Gemini.

```typescript
// Hash gerado a partir de:
{
  selections: { functionId: principleId },
  options: { creativity, focus, count }
}
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto foi desenvolvido para fins educacionais.

---

**Desenvolvido com ❤️ usando [Lovable](https://lovable.dev)**
