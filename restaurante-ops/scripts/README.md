# restaurante-ops Scripts

Scripts específicos do serviço `restaurante-ops` para deploy, inspeção e smoke operacional.

## Conteúdo

- deploy:
  - `deploy-railway.sh`
  - `railway-deploy.ps1`
- inspeção operacional:
  - `check-deploys.ps1`
- smoke de rate limit:
  - `rate-limit-smoke.ps1`
  - `rate-limit-smoke.sh`

## Observação

Os nomes de scripts de deploy ainda não estão padronizados entre shell e PowerShell. Isso não foi alterado aqui para evitar quebrar automações ou hábitos operacionais existentes.

## Regra de uso

- manter aqui apenas scripts que afetam exclusivamente o `restaurante-ops`
- para deploy em monorepo, seguir a regra documentada em `.github/copilot-instructions.md` e no skill do projeto
