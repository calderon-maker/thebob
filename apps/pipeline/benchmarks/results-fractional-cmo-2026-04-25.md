# Benchmark TheBob, piloto fractional-cmo, 2026-04-25

> Rodada de teste com **10 pessoas** descobertas via LinkedIn search.
> 7 crawlers + análise de sentimento via Claude.

## Sumário executivo

| Métrica | Valor |
|---|---|
| Pessoas processadas | 10 |
| Tempo total | 295.8 s |
| Custo total | **$0.33 USD** (~R$ 1.65) |
| Custo médio por pessoa | $0.0329 (~R$ 0.16) |
| Projeção 1 lista (50 pessoas) | $1.65 (~R$ 8.23) |
| Projeção 10 listas (500 pessoas) | $16.46 (~R$ 82.32) |

Custo orçado no plano (memoria_projeto §Stack): R$ 1.700/mês infra. Comparativo: rodar 500 pessoas custa ~R$ 82 por execução; 1 execução/mês cabe folgado dentro do orçamento.

## Custo por crawler (médias)

| Crawler | Execuções | Sucesso | Tempo médio | Custo médio | Custo total |
|---|---|---|---|---|---|
| linkedin | 10 | 10/10 | 18545 ms | $0.0182 | $0.182 |
| instagram | 10 | 10/10 | 11622 ms | $0.0023 | $0.023 |
| tiktok | 10 | 10/10 | 5891 ms | $0.0000 | $0.000 |
| youtube | 10 | 10/10 | 2 ms | $0.0000 | $0.000 |
| firecrawl-media | 10 | 10/10 | 25271 ms | $0.0025 | $0.025 |
| firecrawl-recognition | 10 | 10/10 | 7515 ms | $0.0049 | $0.049 |
| google-trends | 10 | 10/10 | 0 ms | $0.0000 | $0.000 |
| claude-sentiment | 10 | 4/10 | 0 ms | $0.0000 | $0.000 |

## Custo por pessoa

| # | Nome | Headline | Tempo total | Custo total |
|---|---|---|---|---|
| 1 | Lucas Silva | Estrategista de Growth para Delivery | Fractional CMO | Tráf | 63659 ms | $0.0226 |
| 2 | Paulo Guerchfeld | CMO | Diretor de Marketing | Advisory em Arquitetura de Estr | 56129 ms | $0.0349 |
| 3 | Flávia da Costa e Silva | Fractional CMO | Estratégia, marketing e dados para acelerar | 74433 ms | $0.0529 |
| 4 | Christovam Bluhm Jr. | Fractional CMO | Estratégia de Marketing | Advisory Board |  | 119961 ms | $0.0151 |
| 5 | Nate BeMiller | Fractional CMO & Growth Marketing Executive | US Citizen in  | 72466 ms | $0.0124 |
| 6 | Daniela Moreira | CMO | Demand Generation | Content Marketing | Growth | 3X Fo | 63942 ms | $0.0224 |
| 7 | Bruno Morano | Marketing Executive | CMO | Fractional CMO | Brand & Growth  | 52423 ms | $0.0151 |
| 8 | Lara A. | CMO & Marketing Director | I build growth engines for intern | 53278 ms | $0.0207 |
| 9 | Scheila F. | Internationalization Specialist | Growth Consultant | Fracti | 70585 ms | $0.0709 |
| 10 | Lourenço Guimarães | Fintech & Crypto Marketing Strategy Director & Fractional CM | 61585 ms | $0.0124 |

## Próximos passos sugeridos

1. Validar handles sociais (IG, TikTok, YouTube) manualmente, o discovery atualmente assume que o slug do LinkedIn = handle, taxa de acerto deve ficar abaixo de 50%.
2. Rodar normalização e score (peso 25/15/20/25/15) em `src/score/compute.ts`.
3. Persistir os resultados em Supabase (`profiles` + tabela `raw_signals` jsonb).
4. Definir cadência de re-coleta, mensal completo + delta semanal só de LinkedIn.
