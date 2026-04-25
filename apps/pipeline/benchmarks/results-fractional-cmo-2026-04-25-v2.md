# Benchmark TheBob, piloto fractional-cmo v2, 2026-04-25

> Rodada de teste com **10 pessoas** + resolver de handles sociais ativo.
> Fluxo: discovery → LinkedIn + mídia + reconhecimento (paralelo) → resolve-handles + sentiment → IG + TikTok + YouTube + Trends (paralelo).

## Sumário executivo

| Métrica | Valor |
|---|---|
| Pessoas processadas | 10 |
| Tempo total | 687.8 s |
| Custo total | **$0.83 USD** (~R$ 4.14) |
| Custo médio por pessoa | $0.0828 (~R$ 0.41) |
| Projeção 1 lista (50 pessoas) | $4.14 (~R$ 20.70) |
| Projeção 10 listas (500 pessoas) | $41.40 (~R$ 206.98) |
| **IG resolvido** | 8/10 |
| **TikTok resolvido** | 7/10 |
| **YouTube resolvido** | 4/10 |

Custo orçado no plano (memoria_projeto §Stack): R$ 1.700/mês infra. Comparativo: rodar 500 pessoas custa ~R$ 207 por execução, 1 execução/mês cabe folgado.

## Custo e tempo por crawler

| Crawler | Execuções | Sucesso | Tempo médio | Custo médio | Custo total |
|---|---|---|---|---|---|
| linkedin | 10 | 10/10 | 12885 ms | $0.0178 | $0.178 |
| firecrawl-media | 10 | 10/10 | 4733 ms | $0.0000 | $0.000 |
| firecrawl-recognition | 10 | 10/10 | 1208 ms | $0.0000 | $0.000 |
| resolve-handles | 10 | 10/10 | 40919 ms | $0.0534 | $0.534 |
| instagram | 10 | 10/10 | 5337 ms | $0.0018 | $0.018 |
| tiktok | 10 | 10/10 | 5086 ms | $0.0028 | $0.028 |
| youtube | 10 | 10/10 | 9355 ms | $0.0020 | $0.020 |
| google-trends | 10 | 10/10 | 0 ms | $0.0000 | $0.000 |

## Resultado por pessoa

| # | Nome | IG handle | TikTok handle | YT | Tempo | Custo |
|---|---|---|---|---|---|---|
| 1 | Lucas Silva | lucassilva | lucassilva | - | 73513 ms | $0.0688 |
| 2 | Paulo Guerchfeld | pguerchfeld | paulo.guerchfeld | ✓ | 97616 ms | $0.0875 |
| 3 | Flávia da Costa e Silva | flavia_silva | - | ✓ | 100755 ms | $0.1098 |
| 4 | Juan Pablo Motterle | - | juanpablomotterle | - | 54025 ms | $0.0645 |
| 5 | Lourenço Guimarães | lourenco_guimaraes | lourencoguimaraes | ✓ | 112453 ms | $0.0655 |
| 6 | Nate BeMiller | - | - | ✓ | 95726 ms | $0.0632 |
| 7 | Daniela Moreira | daniela.moreira | daniela.moreira | - | 61783 ms | $0.0665 |
| 8 | Lara A. | laraoaz | - | - | 44991 ms | $0.0628 |
| 9 | Scheila F. | scheilafs | scheilaf | - | 80811 ms | $0.1268 |
| 10 | Bruno Morano | brunomorano | brunomorano | - | 73551 ms | $0.0625 |

## Próximos passos sugeridos

1. Score compute com pesos 25/15/20/25/15 em `src/score/compute.ts`
2. Persistir os 10 perfis em Supabase (`profiles` + `raw_signals` jsonb)
3. Camada de filiação institucional (cruzamento com listas de associados ABRADI/IAB/Aberje)
4. Trocar Firecrawl search por Tavily ou Exa para qualidade de mídia
5. Resolver Google Trends (Firecrawl scrape direto da URL pública)
