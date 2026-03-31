# Migration Plan

## Objetivo

Migrar o `guia-priorizado-2026` de dois HTMLs estaticos para uma arquitetura moderna com:

- frontend React para o guia publico
- frontend React para o CMS
- core de backend compartilhado
- Supabase versionado no GitHub
- publicacao no Vercel para os dois apps

## Resultado esperado

### Guia publico

- manter as 5 abas do guia atual
- preservar navegacao cruzada entre habilidades, AE, matriz e escopo
- melhorar performance e organizacao do codigo
- publicar no Vercel

### CMS

- manter CRUD funcional para:
  - curriculo paulista
  - aprendizagem essencial
  - escopo-sequencia
  - matriz prova paulista
- mover logica sensivel para backend
- adicionar auth e controle de acesso
- publicar no Vercel

## Fase 1 - Mapeamento e banco

1. Identificar o projeto Supabase novo oficial.
2. Rodar `supabase init` no repo.
3. Linkar o repo ao projeto novo.
4. Versionar schema, functions, policies e migrations.
5. Mapear volumes de dados e tabelas.

Entregavel:

- pasta `supabase/` versionada
- mapa tecnico do banco no repo

## Fase 2 - Core compartilhado

1. Extrair regras de negocio do HTML legado.
2. Criar pacote central para:
   - normalizacao AF/EM
   - conversao `ano` vs `serie`
   - validacao de habilidades
   - relacoes entre AE, aulas, habilidades e descritores
   - filtros e contratos

Entregavel:

- `packages/core`

## Fase 3 - Guia publico

1. Criar app React do guia.
2. Reproduzir as 5 abas.
3. Reproduzir hash e navegacao cruzada onde fizer sentido.
4. Trocar cargas gigantes por queries pequenas e agregadas.
5. Publicar no Vercel.

Entregavel:

- `apps/guia`

## Fase 4 - CMS

1. Criar app React do CMS.
2. Reproduzir os 4 modulos.
3. Mover escrita e validacao para backend.
4. Implementar auth e autorizacao.
5. Publicar no Vercel.

Entregavel:

- `apps/cms`

## Fase 5 - Backend

1. Criar camada de backend para:
   - escrita segura
   - validacoes
   - cascade rename/delete de habilidades
   - auditoria
2. Escolher entre:
   - Vercel Functions
   - app Node dedicada

Recomendacao inicial:

- comecar com Vercel Functions

## Fase 6 - Paridade

Checklist minimo:

- filtros por serie/ano
- filtros por componente
- filtros por bimestre
- navegacao entre abas
- navegacao cruzada entre escopo, AE, matriz e habilidades
- CRUD do CMS
- validacao de habilidades
- cascade rename/delete

## Fase 7 - Publicacao final

1. Configurar variaveis no Vercel.
2. Publicar o guia.
3. Publicar o CMS.
4. Validar os dois ambientes.
5. So depois descontinuar a versao HTML antiga.

## Extras recomendados

- auditoria de alteracoes no CMS
- `created_at`, `updated_at`, `updated_by`
- logs e observabilidade
- seeds e scripts reprodutiveis
- design system compartilhado

## Dependencias externas para seguir

Precisamos confirmar:

1. qual e o URL ou `project-ref` do Supabase novo oficial
2. qual estrategia de login o CMS vai usar
3. quais nomes ou dominios voce quer no Vercel para:
   - guia publico
   - cms
