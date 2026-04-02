# Deployment

## Objetivo

Publicar o monorepo em dois projetos separados no Vercel:

- `guia` para o app publico em `apps/guia`
- `cms` para o painel em `apps/cms`

## Estado atual

Ja preparado:

- monorepo com workspaces npm
- `apps/guia` conectado ao projeto Supabase `aingjvjyqhijogpyikii`
- env examples para `guia` e `cms`
- `vercel.json` dentro de cada app Vite

Ainda pendente antes da publicacao final:

- migrar `Habilidades` e `Matriz Prova Paulista` no `apps/guia`
- migrar `cms.html` para `apps/cms`
- implementar backend/auth do CMS

## Vercel: projetos recomendados

Criar dois projetos no Vercel apontando para o mesmo repositorio GitHub:

1. Projeto `guia-priorizado-2026-guia`
2. Projeto `guia-priorizado-2026-cms`

## Root Directory

Configurar no Vercel:

- projeto do guia: `apps/guia`
- projeto do cms: `apps/cms`

## Variaveis de ambiente

Definir em ambos os projetos:

- `VITE_SUPABASE_URL=https://aingjvjyqhijogpyikii.supabase.co`
- `VITE_SUPABASE_SCHEMA=2026_guia_priorizado`
- `VITE_SUPABASE_ANON_KEY=<anon key do projeto novo>`

Definir adicionalmente no projeto `cms`:

- `SUPABASE_URL=https://aingjvjyqhijogpyikii.supabase.co`
- `SUPABASE_SCHEMA=2026_guia_priorizado`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key do projeto novo>`
- `CMS_ADMIN_PASSWORD=<senha compartilhada do CMS>`
- `CMS_SESSION_SECRET=<segredo aleatorio para assinar cookies de sessao>`

Observacao:

- o `anon key` pode ficar no frontend publico
- `service_role` nao deve ir para apps Vite
- `service_role` deve ser usado apenas nas rotas serverless do CMS
- `CMS_ADMIN_PASSWORD` e `CMS_SESSION_SECRET` devem existir so no projeto `cms`

## Build esperado

Cada projeto usa:

- framework: `Vite`
- command: `npm run build`
- output: `dist`

## Checklist antes de publicar

1. Confirmar envs no Vercel.
2. Garantir que o `apps/guia` builda localmente.
3. Publicar primeiro o guia.
4. Validar consultas ao schema `2026_guia_priorizado`.
5. Publicar o CMS somente depois de migrar auth e backend.
