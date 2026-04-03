# Guia Priorizado 2026

Monorepo com painel público e CMS para o Guia do Currículo Priorizado 2026 — SEDUC SP.

## Apps

| App | URL | Descrição |
|-----|-----|-----------|
| **Guia público** | https://guia-priorizado-2026-guia.vercel.app | 5 abas de consulta (AE, Escopo, Habilidades, Matriz PP) |
| **CMS** | https://guia-priorizado-2026-cms.vercel.app | Dashboard + 4 módulos de edição CRUD |

## Stack

- **React 19 + Vite + TypeScript** (monorepo npm workspaces)
- **Supabase** — Cactus Tech, schema `2026_guia_priorizado`
- **Vercel** — deploy automático no push para `main`
- **Vercel Functions** (`apps/cms/api/`) — mutações server-side com service role

## Estrutura

```
guia-priorizado-2026/
├── apps/
│   ├── guia/          → painel público React (5 abas)
│   └── cms/           → CMS React + Vercel Functions
│       └── api/       → endpoints de mutação (service role)
├── packages/
│   └── core/          → domínio compartilhado (tipos, helpers, cascade)
├── CLAUDE.md          → contexto completo para Claude Code
├── DATABASE.md        → schema completo do Supabase
└── README.md          → este arquivo
```

## Documentação

- **[CLAUDE.md](./CLAUDE.md)** — contexto completo da arquitetura, regras de negócio e estado atual
- **[DATABASE.md](./DATABASE.md)** — schema detalhado de todas as tabelas Supabase

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp apps/guia/.env.example apps/guia/.env.local
cp apps/cms/.env.example apps/cms/.env.local
# Preencher VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Rodar guia público (porta 5173)
npm run dev --workspace=apps/guia

# Rodar CMS (porta 5174)
npm run dev --workspace=apps/cms
```

## Regras críticas

- `escopo_af` usa coluna `ano` (não `serie`) — única exceção no schema
- `habilidades` é string espaço-separada — sempre `.split(/\s+/).filter(Boolean)`
- AE code: regex `/^AE\d+/` — nunca split por espaço
- Mutações sempre via Vercel Functions — `service_role` nunca no browser
- Tarefa badge: lookup via `md_tarefas`, não via `escopo.id_md`
