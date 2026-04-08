# Scripts Index

Este diretório concentra scripts utilitários de nível monorepo que não pertencem a um único subprojeto.

## Convenção

- `docs/scripts/security/`: utilitários de auditoria, CVE, hardening e verificações de segurança do monorepo
- `docs/scripts/utils/`: utilitários ad hoc de diagnóstico e manutenção que não pertencem a um subprojeto específico
- `database-backup/supabase/functions/scripts/`: smoke tests e utilitários operacionais das Edge Functions de billing
- `database-backup/`: scripts de backup/restore e sincronização de migrations
- `restaurante-app/scripts/`: scripts específicos do app mobile
- `restaurante-web/scripts/`: scripts específicos do web
- `restaurante-ops/scripts/`: scripts específicos do ops/deploy/rate limit

## Scripts atualmente na raiz lógica do monorepo

### `scripts/`

- `download-latest-eas-builds.sh`
	- Baixa o último build finalizado de Android e iOS no Expo EAS e salva em `docs/builds/`.
	- Gera/atualiza `docs/builds/latest-builds.json` com metadados dos artifacts.
- `publish-eas-builds-to-restaurante-site.sh`
	- Publica os artifacts mais recentes de `docs/builds/` em `restaurante-site/public/downloads/`.
	- Copia `latest-builds.json` para consumo público no site.

### `scripts/security/`

- `check-cve-status.ps1`
- `cve-patch-report.ps1`

### `scripts/utils/`

- `check_chars.js`

Observação:
- `check_chars.js` é um utilitário legado/ad hoc para inspeção manual de caracteres em arquivo alvo. Pode exigir ajuste de caminho antes do uso.


## Regra prática

Se um script só serve para um subprojeto, ele deve ficar no `scripts/` daquele subprojeto.
Se ele serve ao monorepo inteiro, deve ficar em `scripts/<dominio>/`.