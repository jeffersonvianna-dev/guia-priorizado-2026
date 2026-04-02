# Schema Map: `2026_guia_priorizado`

## Origem deste mapa

Este mapeamento foi confirmado em `2026-03-31` a partir do projeto Supabase:

- project ref: `aingjvjyqhijogpyikii`
- schema usado pelo Guia: `2026_guia_priorizado`

O repo local ja esta linkado ao projeto novo, mas ainda nao contem o historico remoto de migrations.

## Estado atual do versionamento

- `supabase/.temp/project-ref` aponta para `aingjvjyqhijogpyikii`
- `supabase db pull --linked --schema 2026_guia_priorizado` falhou porque o historico remoto nao bate com o repo local
- `supabase migration fetch --linked` falhou por falta de `SUPABASE_DB_PASSWORD`

Conclusao:

- o schema foi confirmado via introspeccao de tipos
- o historico de migrations ainda precisa ser sincronizado antes de versionarmos o SQL remoto completo

## Tabelas confirmadas

### `curriculo_paulista`

Uso:

- base de validacao de habilidades no CMS
- origem para cascade rename/delete de `id_habilidade`

Colunas principais:

- `id`
- `id_habilidade`
- `componente`
- `segmento`
- `serie`
- `texto`

### `escopo_af`

Uso:

- escopo do guia para Anos Finais

Regra critica:

- usa `ano`, nao `serie`

Colunas principais:

- `id`
- `ano`
- `componente`
- `bimestre`
- `aula`
- `titulo`
- `conteudo`
- `objetivos`
- `habilidades`
- `aprendizagem_essencial`
- `descritivo`
- `objeto`
- `referencias`
- `unidade_tematica`

### `escopo_em`

Uso:

- escopo do guia para Ensino Medio

Regra critica:

- usa `serie`

Colunas principais:

- `id`
- `serie`
- `componente`
- `bimestre`
- `aula`
- `titulo`
- `conteudo`
- `objetivos`
- `habilidades`
- `aprendizagem_essencial`
- `descritivo`
- `objeto`
- `referencias`
- `unidade_tematica`

### `ae_detalhes_af`

Uso:

- detalhes de Aprendizagem Essencial para AF

Regra critica:

- usa `serie` mesmo no contexto de AF

Colunas principais:

- `id`
- `segmento`
- `serie`
- `componente`
- `bimestre`
- `ae`
- `titulo`
- `hab_priorizada`
- `hab_relacionadas`
- `conhecimentos_previos`

### `ae_detalhes_em`

Uso:

- detalhes de Aprendizagem Essencial para EM

Colunas principais:

- `id`
- `segmento`
- `serie`
- `componente`
- `bimestre`
- `ae`
- `titulo`
- `hab_priorizada`
- `hab_relacionadas`
- `conhecimentos_previos`

### `matriz_descritores_af`

Uso:

- descritores da Matriz Prova Paulista para AF

Regra critica:

- usa `serie`

Colunas principais:

- `id`
- `serie`
- `componente`
- `ae`
- `bimestre`
- `grupo`
- `descritor`

### `matriz_descritores_em`

Uso:

- descritores da Matriz Prova Paulista para EM

Colunas principais:

- `id`
- `serie`
- `componente`
- `ae`
- `bimestre`
- `grupo`
- `descritor`

## Regras de negocio confirmadas no legado

- `escopo_af` filtra por `ano`
- `escopo_em` filtra por `serie`
- `ae_detalhes_*` filtram por `serie`
- `matriz_descritores_*` filtram por `serie`
- `curriculo_paulista` valida qualquer codigo usado em AE
- o CMS atual substitui ou remove `id_habilidade` em:
  - `escopo_af.habilidades`
  - `escopo_em.habilidades`
  - `ae_detalhes_af.hab_priorizada`
  - `ae_detalhes_af.hab_relacionadas`
  - `ae_detalhes_af.conhecimentos_previos`
  - `ae_detalhes_em.hab_priorizada`
  - `ae_detalhes_em.hab_relacionadas`
  - `ae_detalhes_em.conhecimentos_previos`

## Observacoes para a migracao

- o guia publico pode usar `anon key`
- o CMS nao deve repetir o CRUD direto do HTML antigo
- o backend do CMS precisa assumir:
  - validacao contra `curriculo_paulista`
  - cascade rename/delete de habilidades
  - auth e autorizacao

## Proxima acao para versionar o banco

Assim que a senha do banco remoto estiver disponivel na maquina:

1. exportar `SUPABASE_DB_PASSWORD`
2. rodar `supabase migration fetch --linked`
3. rodar `supabase db pull --linked --schema 2026_guia_priorizado`
4. revisar os SQLs antes de commitar
