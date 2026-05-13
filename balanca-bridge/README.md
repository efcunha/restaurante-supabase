# balanca-bridge

Bridge local para leitura de balanca serial/USB via HTTP.

## Requisitos

- Node.js 18+
- Acesso fisico ao dispositivo serial da balanca

## Setup rapido (Windows)

```powershell
cd d:/restaurante-supabase/balanca-bridge
copy .env.example .env
npm install
npm start
```

Depois valide:

```powershell
Invoke-RestMethod -Uri "http://localhost:3031/status"
```

## Variaveis de ambiente

- `BALANCA_PORT`: ex `COM3`
- `BALANCA_BAUD`: ex `9600` (ou `2400`)
- `BALANCA_PROTO`: `PRT1`, `PRT2` ou `PRT3`
- `API_PORT`: porta HTTP (padrao `3031`)
- `API_KEY`: opcional. Se definido, exige header `x-api-key`.
- `ALLOWED_ORIGINS`: opcional. Lista CSV de origens permitidas para CORS.

## Endpoints

- `GET /healthz`
- `GET /status`
- `GET /portas`
- `GET /peso`
- `GET /peso/estavel?timeout_ms=5000`
- `POST /tara`

## Executar como servico (opcional)

Opcao com PM2:

```powershell
npm install -g pm2
cd d:/restaurante-supabase/balanca-bridge
pm2 start index.js --name balanca-bridge
pm2 save
```

Para iniciar automaticamente no boot (Windows):

```powershell
pm2 startup
```

## Seguranca

- Nao publicar `API_KEY` em logs.
- Restrinja origem por `ALLOWED_ORIGINS` em ambiente de producao.
- Nao exponha a porta 3031 em rede publica sem controle de acesso.
