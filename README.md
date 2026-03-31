# Guia Priorizado 2026

Repositorio do Guia Priorizado 2026, hoje baseado em dois HTMLs estaticos com leitura e escrita direta no Supabase.

## Estado atual

- Repo oficial: `jeffersonvianna-dev/guia-priorizado-2026`
- Estrutura atual:
  - `escopo_sequencia.html`
  - `cms.html`
  - `CLAUDE.md`
- Nao existe app React
- Nao existe backend Node dedicado
- Nao existe pasta `supabase/` versionada no repo

## Arquitetura atual

### Guia publico

Arquivo principal:

- `escopo_sequencia.html`

Caracteristicas:

- pagina unica HTML com CSS e JS inline
- 5 abas:
  - Para Comecar
  - Aprendizagem Essencial
  - Escopo-Sequencia
  - Habilidades
  - Matriz Prova Paulista
- usa hash, `pushState` e `popstate`
- carrega dados diretamente do Supabase no browser
- busca tabelas inteiras com `_fetchAll()`

Tabelas lidas:

- `escopo_af`
- `escopo_em`
- `ae_detalhes_af`
- `ae_detalhes_em`
- `matriz_descritores_af`
- `matriz_descritores_em`

### CMS

Arquivo principal:

- `cms.html`

Caracteristicas:

- pagina unica HTML com CSS e JS inline
- 4 modulos:
  - Curriculo Paulista
  - Aprendizagem Essencial
  - Escopo-Sequencia
  - Matriz Prova Paulista
- CRUD direto no Supabase pelo frontend
- sem autenticacao no app
- regras de negocio importantes implementadas no JS inline

Tabelas usadas:

- `curriculo_paulista`
- `ae_detalhes_af`
- `ae_detalhes_em`
- `escopo_af`
- `escopo_em`
- `matriz_descritores_af`
- `matriz_descritores_em`

## Supabase legado referenciado no codigo

- project ref: `uhbsnrnnnhntkibtsyre`
- schema usado no browser: `guia_priorizado`

Observacoes:

- URL e anon key estao embutidas no HTML
- o CMS escreve no banco direto do navegador
- isso precisa mudar na nova arquitetura

## Regras de negocio que precisam ser preservadas

- `escopo_af` usa coluna `ano`
- `escopo_em` usa coluna `serie`
- `ae_detalhes_*` e `matriz_descritores_*` usam `serie`
- validacao de habilidades contra `curriculo_paulista`
- cascade rename/delete de `id_habilidade` no CMS
- navegacao cruzada entre escopo, AE, habilidades e matriz

## Riscos do estado atual

- CMS sem auth
- CRUD sensivel direto no frontend
- segredo e acesso expostos no HTML
- logica critica dificil de testar
- banco nao versionado no repo
- risco alto de regressao sem checklist de paridade

## Direcao alvo

Arquitetura recomendada:

- monorepo
- `apps/guia`
- `apps/cms`
- `packages/core`
- opcionalmente `packages/ui`
- `supabase/` versionado
- backend leve com Vercel Functions ou Node dedicado

## Publicacao alvo

- um projeto Vercel para o guia publico
- um projeto Vercel para o CMS
- variaveis e configuracoes separadas

## Documentos de apoio

- plano de migracao: `MIGRATION_PLAN.md`
- contexto historico reduzido: `CLAUDE.md`
