# Storybook ONDA 3 - Snyk Evidence (2026-04-17)

Data: 2026-04-17  
Escopo: validacao de seguranca SAST para a rodada ONDA 3 de stories operacionais no Storybook

## Contexto

Esta evidencia consolida a validacao de seguranca apos a criacao de stories ONDA 3 em:

- .storybook/stories/restaurante-app/
- .storybook/stories/restaurante-web/

## Resumo Executivo

- Resultado: sem achados de severidade alta no escopo analisado.
- Status: aprovado para continuidade de rollout de documentação/preview.
- Observacao: o scan foi executado com threshold `high`.

## Execucoes Snyk

### 1) Scan de stories ONDA 3 (diretorio de stories)

Ferramenta: `mcp_snyk_snyk_code_scan`  
Path: `d:\restaurante-supabase\.storybook\stories`  
Severity threshold: `high`  
Resultado: `issueCount=0`

### 2) Scan de Storybook completo

Ferramenta: `mcp_snyk_snyk_code_scan`  
Path: `d:\restaurante-supabase\.storybook`  
Severity threshold: `high`  
Resultado: `issueCount=0`

### 3) Scan de telas (app)

Ferramenta: `mcp_snyk_snyk_code_scan`  
Path: `d:\restaurante-supabase\restaurante-app\src\screens`  
Severity threshold: `high`  
Resultado: `issueCount=0`

### 4) Scan de telas (web)

Ferramenta: `mcp_snyk_snyk_code_scan`  
Path: `d:\restaurante-supabase\restaurante-web\src\screens`  
Severity threshold: `high`  
Resultado: `issueCount=0`

## Evidencias de cobertura ONDA 3

- Verificacao de existencia dos arquivos planejados da ONDA 3:
  - restaurante-app: `15/15` arquivos presentes
  - restaurante-web: `18/18` arquivos presentes
- Verificacao de indexacao Storybook (instancia local em `:6028`):
  - `index.json` entries: `522`

## Riscos residuais / limites

- O threshold utilizado foi `high`; podem existir achados `low/medium` fora deste recorte.
- Resultado representa estado do codigo no momento da execucao e no escopo informado.

## Conclusao

A rodada ONDA 3 de stories operacionais passou no gate SAST de severidade alta, sem findings no escopo analisado.
