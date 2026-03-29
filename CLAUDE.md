# Escopo Sequência 2026 — Guia do Currículo Priorizado

Projeto com dois arquivos HTML servidos pelo GitHub Pages. Todos os dados vêm do Supabase (schema `guia_priorizado`). Git é a fonte da verdade — não há mais arquivos intermediários de importação.

## Estrutura de arquivos

```
Escopo Sequência 2026/
├── escopo_sequencia.html   # Guia público (5 abas, leitura do Supabase)
├── cms.html                # Painel interno CRUD (edita o Supabase)
├── CLAUDE.md               # Este arquivo
├── CONTEXTO_PARSE.md       # Regras de extração dos PDFs → CSV (referência histórica)
├── parse_ae.py             # Script pdfplumber para extrair AEs de PDFs (referência)
├── gerar_html.ps1          # Script original de geração — obsoleto (referência)
├── gerar_html.py           # Script Python de geração — obsoleto (referência)
├── gerar_sql_import.py     # Geração de SQL para importação — obsoleto (dados no Supabase)
├── importar_supabase.py    # Script de importação — obsoleto (dados no Supabase)
└── check_keys.ps1          # Utilitário de diagnóstico de chaves
```

## Supabase — schema `guia_priorizado`

Projeto: Cactus Tech (`uhbsnrnnnhntkibtsyre`)

| Tabela | Colunas-chave | Linhas |
|---|---|---|
| `escopo_af` | id, componente, **ano**, bimestre, aula, titulo, habilidades, aprendizagem_essencial, ... | ~1324 |
| `escopo_em` | igual mas **serie** em vez de ano | ~895 |
| `ae_detalhes_af` | segmento, serie, componente, bimestre, ae, titulo, hab_priorizada, hab_relacionadas, conhecimentos_previos | 204 |
| `ae_detalhes_em` | igual | 125 |
| `matriz_descritores_af` | serie, componente, ae, bimestre, grupo, descritor | 644 |
| `matriz_descritores_em` | igual | 646 |
| `curriculo_paulista` | id, id_habilidade (unique), componente, serie, segmento, texto | — |

**CRÍTICO:** `escopo_af` usa coluna `ano`; todas as outras tabelas de série usam `serie`.

## Arquitetura — escopo_sequencia.html (guia público)

### Init assíncrono
- `_initApp()` busca todas as tabelas via `_fetchAll()` (paginação de 1000 em 1000)
- Mapeia para objetos com chaves capitalizadas: `{Componente, Ano/Serie, Bimestre, Aula, Titulo, Habilidades, AE}`
- Pré-seleciona 6º Ano / Matemática / 1º Bimestre em todas as abas
- **F5:** Verifica `location.hash` e ativa a aba correspondente antes de setar `_navReady = true`

### 5 Abas
1. **Para Começar** — texto estático
2. **Aprendizagem Essencial** — `AE_AF` / `AE_EM` (ae_detalhes); lista expansível por bimestre
3. **Escopo-Sequência** — `DATA_AF` / `DATA_EM`; cards de aula por semana (7 semanas)
4. **Habilidades** — `habMap` construído com `.split(/\s+/)` no campo `habilidades`; `selectHab` busca pelo DOM
5. **Matriz Prova Paulista** — AEs de `AE_AF/EM`; aulas/habs derivadas do escopo; descritores de `MATRIZ_DESC_AF/EM`

### Padrões críticos
- Campo `habilidades`: SEMPRE `.split(/\s+/).filter(Boolean)` — nunca usar a string inteira
- `goToHab`: busca hab-box pelo `.querySelector('.hab-code').textContent` no DOM
- `setTab(id, noSync?)`: `history.pushState` para registrar no histórico; `popstate` restaura aba + filtros
- Filtros em cascata: `onFiltro()`, `aeOnFiltro()`, `habOnFiltro()` — leem valor do DOM ANTES de reescrever innerHTML e restauram depois

### Layout de alinhamento (PADRÃO — sempre usar)

Header, tabs e filtros usam padding intrínseco para alinhar com o corpo (max-width: 1100px):

```css
/* Header — inner div */
header { background: var(--blue); box-shadow: ...; position: sticky; top: 0; z-index: 10; }
.header-inner { max-width: 1100px; margin: 0 auto; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }

/* Tabs nav — padding intrínseco */
.tabs-nav { display: flex; gap: 8px; overflow-x: auto;
  padding: 12px max(24px, calc((100% - 1100px) / 2 + 24px)); }

/* Filtros — padding intrínseco */
.filtros { display: flex; flex-wrap: wrap; gap: 16px;
  padding: 18px max(24px, calc((100% - 1100px) / 2 + 24px)); }
```

```html
<header>
  <div class="header-inner">...</div>
</header>
<nav class="tabs-nav">
  <button>...</button>
</nav>
<div id="tab-xxx" class="tab-panel">
  <div class="filtros">...</div>
  <div class="xxx-wrap"> <!-- max-width: 1100px; margin: 0 auto; padding: 28px 24px -->
    ...conteúdo...
  </div>
</div>
```

## Arquitetura — cms.html (painel interno)

### 4 Módulos
1. **Currículo Paulista** — CRUD em `curriculo_paulista`; `_segFromCod(cod)` deriva segmento automaticamente
2. **Aprendizagem Essencial** — CRUD em `ae_detalhes_af/em`; chips de habilidade validados vs curriculo_paulista
3. **Escopo-Sequência** — CRUD em `escopo_af/em`; habilidades como chip input validado
4. **Matriz PP** — CRUD em `matriz_descritores_af/em`; AE como chip (max=1, validado vs ae_detalhes)

### Padrões críticos
- `escopoTbl(serie)` → `escopo_af` ou `escopo_em`; `serieCol(serie)` → `ano` ou `serie`
- `_segFromCod(cod)`: `/^EF0[1-5]/` → EFAI, `/^EF0[6-9]/` → EFAF, `/^EM/` → EM
- Cascade rename/delete de `id_habilidade` propaga para todos os campos de habilidade
- `showModule(id)` atualiza `history.replaceState` com o hash; init restaura pelo hash no F5
- Sem auth (v1)

### Layout (PADRÃO)
```
.mod-tabs (sticky, z-index:100) → módulo ativo
.filtros / .filtros-inner (max-width:1200px) → padding: 18px 24px
.content (max-width:1200px) → padding: 28px 24px
```

## Publicação

- **GitHub:** https://github.com/jeffersonvianna-dev/guia-priorizado-2026
- **GitHub Pages:** https://jeffersonvianna-dev.github.io/guia-priorizado-2026/escopo_sequencia.html
- `cms.html` e `escopo_sequencia.html` estão no repo
- Para atualizar: editar localmente → `git add cms.html escopo_sequencia.html && git commit -m "..." && git push`

## Design System

- **Local:** `C:\Users\jeffe\OneDrive\Área de Trabalho\Code Claude\design-system-guia-2026.html`
- **GitHub:** https://github.com/jeffersonvianna-dev/design-system (index.html)
- Tokens: `--blue:#005BAC`, `--blue-pale:#e8f0f9`, `--orange:#F47920`, `--gray:#f5f6fa`, `--gray-mid:#dde2ec`
- Espaçamentos: header `16px 24px`, filtros `18px 24px`, tabs `12px 24px`, content `28px 24px`
