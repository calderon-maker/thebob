# TheBob, monorepo

> Ranking mensal do Abramark, selo de prova social para quem vende serviço em marketing digital. Hub editorial em `thebestof.com.br` e selo em `thebob.com.br`.

## Stack

Next.js 15 (App Router) + Tailwind 4 + shadcn/ui + Supabase Pro + Stripe Brasil + Apify + Firecrawl + Claude API. Hosting em VPS Ubuntu da ecommerceCAMP / BCX, atrás de Cloudflare.

Detalhes em `bcx-skills/bcx-thebob/SKILL.md` e nos skills filhos (`bcx-deploy-nextjs`, `bcx-supabase`, `bcx-stripe-br`, `bcx-dns-registrobr`, `bcx-pipeline-data`).

## Estrutura

```
thebob/
├── apps/
│   ├── web/         Next.js 15, App Router, RSC
│   └── pipeline/    Worker + scheduler (Node 20)
├── packages/
│   ├── db/          Cliente Supabase tipado, types compartilhados
│   └── ui/          Componentes shadcn customizados (a popular)
├── supabase/
│   ├── migrations/  Schema versionado
│   ├── functions/   Edge functions
│   └── policies/    RLS por tabela
├── .github/
│   └── workflows/   deploy.yml + migrate.yml
├── package.json     Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── ecosystem.config.cjs   PM2 da VPS BCX
├── .env.example
└── .gitignore
```

## Setup local (dev)

Pré-requisitos: Node 20+, pnpm 9+, Supabase CLI, Stripe CLI (opcional), Docker (para `supabase start`).

```bash
# 1. Instalar deps
pnpm install

# 2. Copiar variáveis de ambiente
cp .env.example .env.local
# preencher .env.local com chaves de DEV (Supabase local + Stripe test mode)

# 3. Subir Supabase local
pnpm supabase:start
pnpm supabase:reset    # aplica migrations + seed

# 4. Rodar o web em dev
pnpm dev
# abre em http://localhost:3000
```

## Comandos úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Next.js em dev mode com hot reload |
| `pnpm build` | Build de todos os apps + packages |
| `pnpm typecheck` | TypeScript em todos os pacotes |
| `pnpm supabase:start` | Sobe Supabase local (Postgres + Studio + Auth) |
| `pnpm supabase:diff` | Gera migration a partir das mudanças |
| `pnpm supabase:push` | Aplica migrations no projeto remoto (staging/prod) |

## Deploy

CI/CD automático: `git push origin main` dispara `deploy.yml`, build no GitHub Actions, push via SSH para a VPS BCX, `pm2 reload` sem downtime.

Roteiro completo do primeiro deploy em `bcx-skills/bcx-deploy-nextjs/SKILL.md`.

## Convenções

- TypeScript estrito sempre (`noUncheckedIndexedAccess`).
- Nunca commitar `.env*` real (só `.env.example`).
- Toda tabela em `public` precisa ter RLS habilitada (ver `bcx-supabase`).
- Microcopy em PT-BR, "você", direto, sem cerimônia.
- Paleta canônica: Ônix `#0A0A0F`, Ouro BoB `#B8941F`, Off-white `#F5F2E8`.

## Roteiro de fases

1. **Fase 1** Landing de pré-inscrição em `thebob.com.br` (5 a 7 dias)
2. **Fase 2** Hub editorial em `thebestof.com.br/beauty` (10 a 14 dias)
3. **Fase 3** Dashboard pago do Member com paywall (15 a 21 dias)
4. **Fase 4** Pipeline mensal de coleta automática (10 a 14 dias)

Detalhes em `bcx-skills/bcx-thebob/SKILL.md`.
