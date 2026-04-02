# Migration Plan — Guia Priorizado 2026
> Última atualização: 2026-04-02

## Objetivo

Migrar o `guia-priorizado-2026` de dois HTMLs estáticos para uma arquitetura moderna com:
- frontend React para o guia público
- frontend React para o CMS
- core de backend compartilhado
- Supabase versionado no GitHub
- publicação no Vercel para os dois apps

---

## Status das Fases

### ✅ Fase 1 — Mapeamento e banco (concluída)
- Projeto Supabase: Cactus Tech | ID: aingjvjyqhijogpyikii (mesmo da Copa da Escola) | Schema: 2026_guia_priorizado
- Tabelas versionadas e populadas:
  - `escopo_af` (~1324 rows) — coluna `ano` (não `serie`!)
  - `escopo_em` (~895 rows) — coluna `serie`
  - `ae_detalhes_af` (204 rows), `ae_detalhes_em` (125 rows)
  - `matriz_descritores_af` (644 rows), `matriz_descritores_em` (646 rows)
  - `curriculo_paulista` — com segmento derivado do id_habilidade
- RLS configurado: SELECT público, mutações restritas

### ✅ Fase 2 — Core compartilhado (concluída)
- `packages/core` com: `Segmento`, `isAfSerie()`, `getSegmentoFromSerie()`, `getSerieColumn()`
- Regras: `escopo_af` → `ano`; todas as outras → `serie`
- Habilidades: string espaço-separada, sempre `.split(/\s+/).filter(Boolean)`

### ✅ Fase 3 — Guia público (implementação concluída — 2026-04-01)
Entregável: `apps/guia` — React 19 + Vite + TypeScript
- 5 abas: ParaComecar, AprendizagemEssencial, EscopoSequencia, Habilidades, MatrizPP
- Hooks: `useGuiaData` (carga única), `useNavigation` (History API, F5, popstate)
- Filtros: segmento / série / componente
- max-width: 1100px, tokens do design system

⏳ Pendente para produção:
- [ ] Configurar env vars no Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Validar funcionamento em produção (dados carregam, navegação OK)

### ✅ Fase 4 — CMS (implementação concluída — 2026-04-01)
Entregável: `apps/cms` — React 19 + Vite + TypeScript
- 4 módulos com hash routing (replaceState): EscopoSequencia, AprendizagemEssencial, MatrizPP, CurriculoPaulista
- ChipInput com validação curriculo/ae
- Toast system
- Cascade rename/delete no módulo Currículo Paulista
- max-width: 1200px

⏳ Pendente para produção:
- [ ] Implementar Vercel Functions em `api/` (service role server-side para mutações)
- [ ] Configurar env vars no Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Validar que service role NÃO aparece no frontend (DevTools > Network)

### ⏳ Fase 5 — Backend (Vercel Functions)
Prioridade: implementar antes do deploy do CMS em produção.

Estrutura:
```
apps/cms/api/
├── escopo/
│   ├── index.ts   ← POST (insert)
│   └── [id].ts    ← PUT (update), DELETE
├── ae/
│   ├── index.ts
│   └── [id].ts
├── matriz/
│   ├── index.ts
│   └── [id].ts
└── curriculo/
    ├── index.ts
    └── [id].ts    ← cascade rename/delete aqui
```

Cada function usa `SUPABASE_SERVICE_ROLE_KEY` (nunca exposta no frontend).

### ⏳ Fase 6 — Paridade e validação
Checklist mínimo:
- [ ] Filtros por série/ano funcionam
- [ ] Filtros por componente funcionam
- [ ] Filtros por bimestre funcionam
- [ ] Navegação entre abas (guia)
- [ ] Navegação entre módulos (cms)
- [ ] CRUD completo nos 4 módulos do CMS
- [ ] Validação de habilidades (chips vs curriculo_paulista)
- [ ] Cascade rename/delete funciona via Vercel Function
- [ ] Sort natural de AEs (AE1, AE2…AE10)

### ⏳ Fase 7 — Publicação final
- [ ] Env vars configuradas no Vercel para guia
- [ ] Env vars configuradas no Vercel para cms (incluindo service role)
- [ ] Validar guia em produção
- [ ] Validar cms em produção
- [ ] Após validação: descontinuar HTMLs estáticos (cms.html, escopo_sequencia.html)

---

## Decisões arquiteturais fixadas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Mutações CMS | Vercel Functions | Service role nunca no frontend |
| Leitura guia | Frontend direto (anon key) | Dados públicos, RLS SELECT configurado |
| Schema | guia_priorizado | Isolamento do schema público |
| Auth CMS | Sem auth (v1) | Fase 1: funcional antes de seguro |
| Design System | @jeffersonvianna-dev/design-system | Consistência visual cross-project |

## Regras críticas (não esquecer)

1. `escopo_af` usa coluna `ano` — TODAS as outras usam `serie`
2. Habilidades: sempre `.split(/\s+/).filter(Boolean)`
3. AE sort: `localeCompare(b, undefined, { numeric: true })`
4. Segmento no CP: incluir em INSERT **e** UPDATE
5. Cascade rename: propagar para escopo_af/em + ae_detalhes_af/em
6. ChipInput Matriz PP: reinicializar ao mudar série ou componente
