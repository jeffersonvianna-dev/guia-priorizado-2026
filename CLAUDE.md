# Guia Priorizado 2026 — Contexto para Claude

## Visão geral
Monorepo npm workspaces com duas aplicações React:
- **apps/guia** → painel público de consulta (5 abas)
- **apps/cms** → painel interno de edição CRUD (4 módulos)
- **packages/core** → domínio compartilhado (tipos, helpers, cliente Supabase)

## Deploys
| App | URL |
|-----|-----|
| Guia público | https://guia-priorizado-2026-guia.vercel.app/ |
| CMS | https://guia-priorizado-2026-cms.vercel.app/ |

## Stack
- React 19.2.4 + Vite 8.0.1 + TypeScript
- Deploy: Vercel (push → deploy automático)
- Supabase: Cactus Tech | ID: `uhbsnrnnnhntkibtsyre` | Schema: `guia_priorizado`
- Design System: `@jeffersonvianna-dev/design-system` (GitHub Packages)

## Variáveis de ambiente
```
VITE_SUPABASE_URL        ← URL do projeto Supabase
VITE_SUPABASE_ANON_KEY   ← anon key (leitura no frontend)
SUPABASE_SERVICE_ROLE_KEY ← APENAS em Vercel Functions, NUNCA no frontend
```

---

## REGRAS CRÍTICAS DE DADOS

### 1. Coluna de série é diferente por tabela
```
escopo_af  → coluna: 'ano'    (Única exceção!)
Todas as demais  → coluna: 'serie'
```
Nunca buscar `serie` em `escopo_af` — retorna null silenciosamente.

### 2. Habilidades são string espaço-separada
```ts
// CORRETO ✔
const habs = row.habilidades.split(/\s+/).filter(Boolean)
// ERRADO ✘
const habs = [row.habilidades]
```

### 3. Segmento
- `'AF'` = Anos Finais (6º-9º ano) → tabelas `*_af`
- `'EM'` = Ensino Médio (1ª-3ª série) → tabelas `*_em`
- Usar helpers de `packages/core`: `isAfSerie()`, `getSegmentoFromSerie()`, `getSerieColumn()`

### 4. Sort natural de AEs
```ts
// ERRADO: AE1, AE10, AE2 (sort string)
// CORRETO: AE1, AE2, AE10 (sort numérico)
aes.sort((a, b) => a.ae.localeCompare(b.ae, undefined, { numeric: true }))
```

### 5. Segmento no Currículo Paulista
```ts
// Derivar do código da habilidade:
if (/^EF0[1-5]/.test(cod)) return 'EFAI'
if (/^EF0[6-9]/.test(cod)) return 'EFAF'
if (/^EM/.test(cod)) return 'EM'
// Incluir segmento em AMBOS insert E update!
```

---

## Supabase — Schema `guia_priorizado`

| Tabela | Col. série | Rows | Observação |
|--------|-----------|------|-----------|
| `escopo_af` | **`ano`** | ~1324 | Única que usa `ano`! |
| `escopo_em` | `serie` | ~895 | |
| `ae_detalhes_af` | `serie` | 204 | |
| `ae_detalhes_em` | `serie` | 125 | |
| `matriz_descritores_af` | `serie` | 644 | |
| `matriz_descritores_em` | `serie` | 646 | |
| `curriculo_paulista` | `serie` | — | `id_habilidade` é unique |

### Campo `habilidades` (escopo_af e escopo_em)
String espaço-separada de códigos. Ex: `"EF06MA01 EF06MA02 EF06MA03"`  
SEMPRE fazer `.split(/\s+/).filter(Boolean)` antes de usar.

### RLS
- SELECT: público (anon key suficiente)
- INSERT/UPDATE/DELETE: service role (ou políticas específicas)

---

## apps/guia — 5 abas

| Aba | Fonte de dados | Comportamento |
|-----|---------------|---------------|
| Para Começar | — | Texto estático |
| Aprendizagem Essencial | `ae_detalhes_af/em` | Lista por bimestre, expansível, chips clicáveis |
| Escopo-Sequência | `escopo_af/em` | Cards de aula por semana (7 semanas) |
| Habilidades | `escopo_af/em` | habMap iterado, filtro por habilidade individual |
| Matriz Prova Paulista | `ae_detalhes` + `escopo` + `matriz_descritores` | AEs, aulas e descritores |

### Navegação
- History API (`pushState`/`popState`)
- F5: hash na URL preserva aba ativa
- Cross-tab: `goToHab()`, `goToAula()`, `goToAE()` com `noSync=true`
- `syncTabFilters()` sincroniza série+componente entre abas

### Layout
- Header: full-width bg + inner `max-width: 1100px`
- Tabs/filtros: `padding: 12px max(24px, calc((100% - 1100px) / 2 + 24px))`
- Conteúdo: `max-width: 1100px; margin: 0 auto; padding: 28px 24px`

---

## apps/cms — 4 módulos

| Módulo | Tabelas | Observação |
|--------|---------|------------|
| Escopo-Sequência | `escopo_af/em` | Aula única por série+comp+bimestre |
| Aprendizagem Essencial | `ae_detalhes_af/em` | hab_priorizada max=1, código `AE\d+` |
| Matriz PP | `matriz_descritores_af/em` | AE chip max=1, sort natural |
| Currículo Paulista | `curriculo_paulista` | Cascade rename/delete |

### Segurança CMS
- **Leitura** (SELECT): frontend com anon key
- **Escrita** (INSERT/UPDATE/DELETE): **Vercel Functions** com `SUPABASE_SERVICE_ROLE_KEY`
- `service_role` nunca vai para o browser — sem exceções!

### Cascade rename (Currículo Paulista)
Quando `id_habilidade` muda de `oldCode` para `newCode`:
1. `escopo_af.habilidades` — substituir ocorrência no campo espaço-separado
2. `escopo_em.habilidades` — idem
3. `ae_detalhes_af`: `hab_priorizada`, `hab_relacionadas`, `conhecimentos_previos`
4. `ae_detalhes_em` — idem

### Layout CMS
- max-width: **1200px** (diferente do guia público que usa 1100px)
- Navegação: `history.replaceState` (não pushState) para preservar módulo no F5

---

## packages/core

Lógica de domínio compartilhada entre as apps:
- `Segmento` type: `'AF' | 'EM'`
- `isAfSerie(serie)` → boolean
- `getSegmentoFromSerie(serie)` → Segmento
- `getSerieColumn(segmento)` → `'ano' | 'serie'`

**Sempre importar do core**, nunca reimplementar essas funções nas apps.

---

## Fontes de verdade visuais/comportamentais
- `cms.html` — referência completa do CMS (comportamento + visual)
- `MIGRATION_PLAN.md` — plano de migração (atualizar ao fim de cada fase)

## Design System
Usando `@jeffersonvianna-dev/design-system` (GitHub Packages).
Ver `.npmrc` para configuração do registry privado.
