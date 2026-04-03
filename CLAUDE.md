# Guia Priorizado 2026 — Contexto para Claude

## Visão geral
Monorepo npm workspaces com duas aplicações React + shared core:
- **apps/guia** → painel público de consulta (5 abas)
- **apps/cms** → painel interno de edição CRUD (Dashboard + 4 módulos) + Vercel Functions
- **packages/core** → domínio compartilhado (tipos, helpers, validações, cascade)

## Deploys
| App | URL |
|-----|-----|
| Guia público | https://guia-priorizado-2026-guia.vercel.app |
| CMS | https://guia-priorizado-2026-cms.vercel.app |
Push para `main` → deploy automático no Vercel.

## Stack
- React 19 + Vite + TypeScript (ambas as apps)
- Deploy: Vercel (guia = SPA estático, cms = SPA + Vercel Functions)
- Supabase: Cactus Tech | ID: `aingjvjyqhijogpyikii` | Schema: `2026_guia_priorizado`
- DDL via Management API (`https://api.supabase.com/v1/projects/{ref}/database/query`) — só DDL
- DML via REST API com service role (Vercel Functions)

## Variáveis de ambiente
```
VITE_SUPABASE_URL         ← https://aingjvjyqhijogpyikii.supabase.co
VITE_SUPABASE_ANON_KEY    ← anon key (leitura no frontend)
SUPABASE_SERVICE_ROLE_KEY ← APENAS em Vercel Functions, NUNCA no frontend
CMS_SECRET                ← autenticação das Vercel Functions
```

---

## REGRAS CRÍTICAS DE DADOS

### 1. Coluna de série é diferente por tabela
```
escopo_af       → coluna: 'ano'    (ÚNICA EXCEÇÃO!)
todas as demais → coluna: 'serie'
```
NUNCA buscar `serie` em `escopo_af` — retorna null silenciosamente.

### 2. Habilidades são string espaço-separada
```ts
// CORRETO ✔
const habs = row.habilidades.split(/\s+/).filter(Boolean)
// ERRADO ✘
const habs = [row.habilidades]
```

### 3. AE code: sempre regex, nunca split
```ts
const aeCode = (row.aprendizagem_essencial || '').match(/^AE\d+/)?.[0] || ''
```

### 4. Sort natural de AEs
```ts
aes.sort((a, b) => a.ae.localeCompare(b.ae, undefined, { numeric: true }))
// Resultado: AE1, AE2, AE10 (não AE1, AE10, AE2)
```

### 5. Segmento
- `'AF'` = Anos Finais (6º-9º Ano) → tabelas `*_af`
- `'EM'` = Ensino Médio (1ª-3ª Série) → tabelas `*_em`
- Helpers em `packages/core`: `isAfSerie()`, `getSerieColumn()`, `getEscopoTableName()`

### 6. Segmento no Currículo Paulista
```ts
if (/^EF0[1-5]/.test(cod)) return 'EFAI'
if (/^EF0[6-9]/.test(cod)) return 'EFAF'
if (/^EM/.test(cod))        return 'EM'
// Incluir segmento em AMBOS insert E update!
```

---

## Supabase — Schema `2026_guia_priorizado`

| Tabela | Col. série | Rows | Observação |
|--------|-----------|------|------------|
| `escopo_af` | **`ano`** | ~1324 | ÚNICA que usa `ano`! |
| `escopo_em` | `serie` | ~895 | |
| `ae_detalhes_af` | `serie` | 204 | |
| `ae_detalhes_em` | `serie` | 125 | |
| `matriz_descritores_af` | `serie` | 644 | |
| `matriz_descritores_em` | `serie` | 646 | |
| `curriculo_paulista` | `serie` | ~800 | multi-série espaço-separado |
| `md_tarefas` | `serie` | 359 | tarefas por aula (id_md, id_tarefa, localizador) |

### Campos especiais
- `escopo_af.id_md`, `escopo_em.id_md` → Material Digital ID (varchar nullable)
- `curriculo_paulista.serie` → multi-valor espaço-separado: `"6º Ano 7º Ano"`
- `md_tarefas.bimestre` → formato "B1" (diferente de "1º Bimestre" — não usar em join com escopo)

### md_tarefas schema completo
```
id (int), serie, componente, bimestre (B1/B2...), aula (int),
id_md (Material Digital ID), id_tarefa (Tarefa ID),
localizador (ex: ef06mab1t1), titulo
```
**Join com escopo:** `md_tarefas.serie = escopo.serie/ano` + `componente` + `aula::int`

### PREFIX_SERIE — mapeamento BNCC → série (curriculo_paulista)
```
EF01→1º Ano | EF02→2º Ano | EF03→3º Ano | EF04→4º Ano | EF05→5º Ano
EF06→6º Ano | EF07→7º Ano | EF08→8º Ano | EF09→9º Ano
EF15→1º-5º Ano | EF35→3º-5º Ano | EF67→6º-7º Ano
EF69→6º-9º Ano | EF89→8º-9º Ano | EM13→1ª-3ª Série
```

### RLS
- SELECT: público (anon key)
- INSERT/UPDATE/DELETE: service role (Vercel Functions)

---

## apps/guia — 5 abas

| Aba | Fonte | Comportamento |
|-----|-------|---------------|
| Para Começar | — | Texto estático |
| Aprendizagem Essencial | `ae_detalhes_af/em` | Lista por bimestre, chips clicáveis → Habilidades/Escopo |
| Escopo-Sequência | `escopo_af/em` + `md_tarefas` | Cards de aula; stats: Aulas/AEs/Habilidades/Tarefas; badge "📋 Tarefa" |
| Habilidades | `escopo_af/em` | habMap, filtro por código individual, cards estilo Escopo |
| Matriz Prova Paulista | `ae_detalhes` + `escopo` + `matriz_descritores` | AEs, aulas e descritores |

### useGuiaData — carga em Promise.all
Carrega em paralelo: `escopo_af`, `escopo_em`, `ae_detalhes_af`, `ae_detalhes_em`,
`matriz_descritores_af`, `matriz_descritores_em`, `md_tarefas`

### Tarefa badge (EscopoSequencia)
```ts
// Lookup Set construído de md_tarefas
const tarefaSet = new Set(mdTarefas.map(t => `${t.serie}|${t.componente}|${t.aula}`))
const hasTarefa = (a: EscopoRow) => tarefaSet.has(`${a.serie}|${a.componente}|${a.aula}`)
```
- Badge roxo "📋 Tarefa" no header do card se `hasTarefa(aula)`
- Stats pill "T Tarefas" conta `aulas.filter(hasTarefa).length`

### Navegação (useNavigation)
- History API (`pushState`/`popState`), F5 preserva aba + filtros via hash
- Cross-tab: `goToHab()`, `goToAula()`, `goToAE()`
- `navReady` flag evita renders prematuros

### Layout
- Header: full-width bg + inner `max-width: 1100px`
- Tabs/filtros: `padding: 12px max(24px, calc((100% - 1100px) / 2 + 24px))`
- Conteúdo: `max-width: 1100px; margin: 0 auto; padding: 28px 24px`

---

## apps/cms — Dashboard + 4 módulos

Hash routing via `history.replaceState`. Default: `#dashboard`.

### Dashboard (`#dashboard`)
- Cards para cada módulo com contagem de registros do Supabase
- Ícone SVG casa no nav (botão home)
- Logo/título clicável → Dashboard

### Escopo-Sequência (`#escopo`)
- CRUD `escopo_af/em`
- Form: Série*, Componente*, Bimestre*, Nº Aula*, Título*, Habilidades* (ChipInput validado vs curriculo_paulista), UT, Objeto, Conteúdo, Objetivos, Descritivo, Referências, ID Material Digital (opcional, monospace)
- `id_md` salvo/carregado no edit via Vercel Function

### Aprendizagem Essencial (`#ae`)
- CRUD `ae_detalhes_af/em`
- hab_priorizada max=1; código AE regex; ChipInput

### Matriz PP (`#matriz`)
- CRUD `matriz_descritores_af/em`
- AE chip max=1 validado vs ae_detalhes; hab-box grid

### Currículo Paulista (`#cp`)
- CRUD `curriculo_paulista`
- `serie` multi-valor espaço-separado; auto-fill por prefixo BNCC
- Chips de série na tabela; toggles no form
- Filtros: Segmento, Componente (default Matemática), Série
- Cascade rename/delete: propaga para escopo + ae_detalhes

### Vercel Functions (apps/cms/api/)
```
api/escopo/index.ts + [id].ts   → createEscopo, updateEscopo, deleteEscopo
api/curriculo/index.ts + [id].ts
api/ae/index.ts + [id].ts
api/matriz/index.ts + [id].ts
api/_lib/escopo.ts, curriculo.ts, supabase-admin.ts, auth.ts, http.ts
```
- **Segurança:** `service_role` NUNCA no browser — todas as mutações passam pelas Functions
- `api/_lib/escopo.ts`: `EscopoPayload` inclui `id_md?: string | null`

### Layout CMS
- max-width: **1200px** (guia usa 1100px)
- Padding: `max(24px, calc((100% - 1200px) / 2 + 24px))`

---

## packages/core — domínio compartilhado

```ts
// Tipos
type Segmento = 'AF' | 'EM'
interface EscopoAfRow  // col. 'ano'
interface EscopoEmRow  // col. 'serie'

// Helpers de segmento/tabela
isAfSerie(serie: string): boolean
getSerieColumn(serie: string): 'ano' | 'serie'
getEscopoTableName(serie: string): 'escopo_af' | 'escopo_em'

// Habilidades
splitHabilidadeCodes(raw: string): string[]

// AE
parseAeReferences(text: string | null): AeReference[]

// Cascade rename curriculo_paulista
HABILIDADE_CASCADE_TARGETS  // lista de tabelas/colunas afetadas
```

**Regra:** Sempre importar do core, nunca reimplementar nas apps.

---

## Fontes de verdade visuais
- `cms.html` (raiz do repo) — referência comportamental/visual do CMS
- `escopo_sequencia.html` (raiz do repo) — referência do guia público

## Status atual (2026-04-03)
- ✅ Deploy guia e CMS funcionando no Vercel
- ✅ Todas as Vercel Functions em produção
- ✅ Dashboard CMS com cards de contagem
- ✅ CurriculoPaulista: multi-série + auto-fill BNCC + cascade
- ✅ EscopoSequencia CMS: campo id_md no form
- ✅ md_tarefas: 359 tarefas importadas; escopo_af/em.id_md populado corretamente
- ✅ Tarefa badge no guia: usa md_tarefas como fonte (não id_md do escopo)
- ✅ Stats pill "T Tarefas" na aba Escopo-Sequência
