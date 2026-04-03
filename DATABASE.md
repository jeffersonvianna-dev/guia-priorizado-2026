# Database — Schema `2026_guia_priorizado`

**Supabase Project:** `aingjvjyqhijogpyikii`
**URL:** `https://aingjvjyqhijogpyikii.supabase.co`
**Schema:** `2026_guia_priorizado`
**Atualizado em:** 2026-04-03

> ⚠️ O schema `guia_priorizado` referenciado em docs antigos está **INCORRETO**. Usar sempre `2026_guia_priorizado`.

---

## Visão geral das tabelas

| Tabela | Linhas | Usado em | Observação |
|--------|-------:|---------|------------|
| `escopo_af` | 1.324 | Guia + CMS | **Col. série = `ano`** (única exceção!) |
| `escopo_em` | 895 | Guia + CMS | Col. série = `serie` |
| `ae_detalhes_af` | 204 | Guia + CMS | |
| `ae_detalhes_em` | 125 | Guia + CMS | |
| `matriz_descritores_af` | 644 | Guia + CMS | |
| `matriz_descritores_em` | 646 | Guia + CMS | |
| `curriculo_paulista` | 825 | CMS | `id_habilidade` unique; `serie` multi-valor |
| `md_tarefas` | 359 | Guia | Tarefas por aula |

---

## escopo_af

Escopo-Sequência — Anos Finais (6º ao 9º Ano).

> 🔴 **CRÍTICO:** a coluna de série chama-se `ano`, não `serie`!

| Coluna | Tipo | Nulo | Descrição |
|--------|------|------|-----------|
| `id` | integer | NOT NULL | PK |
| `componente` | text | nullable | Ex: "Matemática", "Língua Portuguesa" |
| `ano` | text | nullable | Ex: "6º Ano", "7º Ano", "8º Ano", "9º Ano" |
| `bimestre` | text | nullable | Ex: "1º Bimestre" |
| `aula` | text | nullable | Número da aula (armazenado como text, cast p/ int no join) |
| `titulo` | text | nullable | Título da aula |
| `conteudo` | text | nullable | Conteúdo em texto livre (pode ter listas com `-`) |
| `objetivos` | text | nullable | Objetivos de aprendizagem |
| `habilidades` | text | nullable | **Espaço-separado:** "EF06MA01 EF06MA02" — sempre `.split(/\s+/)` |
| `aprendizagem_essencial` | text | nullable | Ex: "AE1 — Título..." — extrair código via `/^AE\d+/` |
| `unidade_tematica` | text | nullable | |
| `objeto` | text | nullable | Objeto de conhecimento |
| `descritivo` | text | nullable | |
| `referencias` | text | nullable | |
| `id_md` | text | nullable | ID do Material Digital (ex: "140997") |

**Séries válidas:** `6º Ano`, `7º Ano`, `8º Ano`, `9º Ano`

---

## escopo_em

Escopo-Sequência — Ensino Médio (1ª a 3ª Série).

| Coluna | Tipo | Nulo | Descrição |
|--------|------|------|-----------|
| `id` | integer | NOT NULL | PK |
| `componente` | text | nullable | |
| `serie` | text | nullable | Ex: "1ª Série", "2ª Série", "3ª Série" |
| `bimestre` | text | nullable | |
| `aula` | text | nullable | Número da aula (text, cast p/ int) |
| `titulo` | text | nullable | |
| `conteudo` | text | nullable | |
| `objetivos` | text | nullable | |
| `habilidades` | text | nullable | Espaço-separado |
| `aprendizagem_essencial` | text | nullable | |
| `unidade_tematica` | text | nullable | |
| `objeto` | text | nullable | |
| `descritivo` | text | nullable | |
| `referencias` | text | nullable | |
| `id_md` | text | nullable | ID do Material Digital |

**Séries válidas:** `1ª Série`, `2ª Série`, `3ª Série`

---

## ae_detalhes_af / ae_detalhes_em

Aprendizagens Essenciais detalhadas — AF (204 linhas) e EM (125 linhas).

| Coluna | Tipo | Nulo | Descrição |
|--------|------|------|-----------|
| `id` | bigint | NOT NULL | PK |
| `segmento` | text | nullable | "AF" ou "EM" |
| `serie` | text | nullable | |
| `componente` | text | nullable | |
| `bimestre` | text | nullable | |
| `ae` | text | nullable | Código AE. Ex: "AE1", "AE2", "AE10" — sort numérico! |
| `titulo` | text | nullable | Título da AE |
| `hab_priorizada` | text | nullable | Código único de habilidade (max 1 por AE) |
| `hab_relacionadas` | text | nullable | Espaço-separado ou nulo |
| `conhecimentos_previos` | text | nullable | Espaço-separado ou nulo |

**Sort AE:** sempre `localeCompare(b, undefined, { numeric: true })` → AE1, AE2, AE10 (não AE1, AE10, AE2).

---

## matriz_descritores_af / matriz_descritores_em

Descritores da Matriz Prova Paulista — AF (644) e EM (646).

| Coluna | Tipo | Nulo | Descrição |
|--------|------|------|-----------|
| `id` | integer | NOT NULL | PK |
| `serie` | text | nullable | |
| `componente` | text | nullable | |
| `ae` | text | nullable | Código AE (ex: "AE1") |
| `bimestre` | text | nullable | |
| `grupo` | text | nullable | Agrupamento do descritor |
| `descritor` | text | nullable | Texto do descritor |

---

## curriculo_paulista

Currículo Paulista — habilidades de todas as séries/componentes (825 linhas).

| Coluna | Tipo | Nulo | Descrição |
|--------|------|------|-----------|
| `id` | integer | NOT NULL | PK |
| `id_habilidade` | text | NOT NULL | **UNIQUE.** Ex: "EF06MA01" |
| `componente` | text | nullable | |
| `serie` | text | nullable | **Multi-valor espaço-separado:** "6º Ano 7º Ano" |
| `segmento` | text | nullable | "EFAI", "EFAF" ou "EM" — derivado do prefixo de `id_habilidade` |
| `texto` | text | nullable | Texto da habilidade |

**Regras de negócio:**
- `serie` é multi-valor espaço-separado onde cada série ocupa exatamente 2 palavras: `parseSeries(s)` → split de 2 em 2 palavras
- `segmento` derivado do prefixo: `/^EF0[1-5]/`→EFAI, `/^EF0[6-9]/`→EFAF, `/^EM/`→EM — incluir em INSERT **e** UPDATE
- `id_habilidade` é unique → cascade rename para `escopo_af/em.habilidades` e `ae_detalhes_af/em`

**Prefixos BNCC → série:**
```
EF01→1º Ano | EF02→2º Ano | EF03→3º Ano | EF04→4º Ano | EF05→5º Ano
EF06→6º Ano | EF07→7º Ano | EF08→8º Ano | EF09→9º Ano
EF15→1º Ano 2º Ano 3º Ano 4º Ano 5º Ano
EF35→3º Ano 4º Ano 5º Ano
EF67→6º Ano 7º Ano
EF69→6º Ano 7º Ano 8º Ano 9º Ano
EF89→8º Ano 9º Ano
EM13→1ª Série 2ª Série 3ª Série
```

---

## md_tarefas

Tarefas de Material Digital por aula (359 linhas). Criada em 2026-04-03.

| Coluna | Tipo | Nulo | Descrição |
|--------|------|------|-----------|
| `id` | integer | NOT NULL | PK (auto-increment) |
| `componente` | text | NOT NULL | Ex: "Matemática" |
| `serie` | text | NOT NULL | Ex: "6º Ano" — mesmo formato de `escopo_af.ano` |
| `bimestre` | text | NOT NULL | Formato **"B1"** (≠ "1º Bimestre" do escopo — **não usar em JOIN**) |
| `aula` | integer | NOT NULL | Número da aula global |
| `id_md` | text | NOT NULL | ID do Material Digital. Ex: "140997" |
| `id_tarefa` | text | NOT NULL | ID da Tarefa. Ex: "149456" |
| `localizador` | text | NOT NULL | Código localizador. Ex: "ef06mab1t1" |
| `titulo` | text | nullable | Título da tarefa. Ex: "Tarefa 1: Estudando os números naturais" |

**Join com escopo:**
```sql
-- AF:
md_tarefas.serie = escopo_af.ano
  AND md_tarefas.componente = escopo_af.componente
  AND md_tarefas.aula = escopo_af.aula::integer

-- EM:
md_tarefas.serie = escopo_em.serie
  AND md_tarefas.componente = escopo_em.componente
  AND md_tarefas.aula = escopo_em.aula::integer
```

**Atenção:** `bimestre` usa "B1"/"B2" — **não filtrar por bimestre no join** pois o formato é diferente do escopo.

---

## RLS (Row Level Security)

| Operação | Permissão | Como acessar |
|----------|-----------|--------------|
| SELECT | Público (anon) | `VITE_SUPABASE_ANON_KEY` no frontend |
| INSERT / UPDATE / DELETE | Service role | `SUPABASE_SERVICE_ROLE_KEY` — apenas Vercel Functions |

---

## Regras críticas de queries

```ts
// 1. escopo_af usa 'ano', não 'serie'
const col = isAfSerie(serie) ? 'ano' : 'serie'

// 2. Habilidades: sempre split
const habs = row.habilidades.split(/\s+/).filter(Boolean)

// 3. AE code: sempre regex
const aeCode = (row.aprendizagem_essencial || '').match(/^AE\d+/)?.[0] || ''

// 4. AE sort: numérico
aes.sort((a, b) => a.ae.localeCompare(b.ae, undefined, { numeric: true }))

// 5. Tarefa: lookup via md_tarefas (não escopo.id_md)
const tarefaSet = new Set(mdTarefas.map(t => `${t.serie}|${t.componente}|${t.aula}`))
const hasTarefa = (a: EscopoRow) => tarefaSet.has(`${a.serie}|${a.componente}|${a.aula}`)
```

---

## Acesso DDL (migrações manuais)

Quando precisar criar tabelas ou colunas via API (sem CLI do Supabase):

```bash
curl -X POST "https://api.supabase.com/v1/projects/aingjvjyqhijogpyikii/database/query" \
  -H "Authorization: Bearer <personal_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE ..."}'
```

> ⚠️ Esse endpoint aceita DDL mas **bloqueia DML** (INSERT/UPDATE). Para DML, usar REST API com service role.
