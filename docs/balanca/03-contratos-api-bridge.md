# 03 - Contratos API do balanca-bridge

## 1. Padrao de resposta

Campos comuns recomendados:

- timestamp: string ISO
- erro: string | null
- raw: string | null

## 2. GET /peso

### Sucesso

- status: 200
- body:
  - peso_kg: number
  - estavel: boolean
  - timestamp: string
  - raw: string
  - erro: null

### Sem leitura disponivel

- status: 204
- body vazio

### Falha

- status: 503
- body:
  - erro: string

## 3. GET /peso/estavel

### Sucesso

- status: 200
- body:
  - peso_kg: number
  - estavel: true
  - timestamp: string
  - raw: string
  - erro: null

### Timeout

- status: 408
- body:
  - erro: Timeout aguardando leitura estavel

### Falha estrutural

- status: 503
- body:
  - erro: string

## 4. GET /status

- status: 200
- body:
  - serial_aberta: boolean
  - porta: string
  - baud: number
  - protocolo: string
  - ultima_leitura: string | null
  - erro: string | null

## 5. POST /tara

### Sucesso

- status: 200
- body:
  - ok: true
  - mensagem: Comando de tara enviado

### Serial indisponivel

- status: 503
- body:
  - erro: Porta serial nao esta aberta

### Falha inesperada

- status: 500
- body:
  - erro: string

## 6. GET /portas

- status: 200
- body: lista de portas retornadas por SerialPort.list()

## 7. Header de autenticacao opcional

Quando API_KEY estiver configurada no bridge:

- Header obrigatorio: x-api-key
- Rotas sem chave valida devem responder 401/403 conforme politica definida.

## 8. Normalizacao de parser

Formatos aceitos:

- Decimal com kg: +001.500 kg
- Decimal instavel: *001.200 kg
- Inteiro em gramas: 001500 ou N001500

Regra de estabilidade:

- Prefixo * indica estavel=false
- Demais formatos validos assumem estavel=true quando nao houver sinal de instabilidade

## 9. Erros padronizados sugeridos

- serial_unavailable
- read_timeout
- invalid_payload
- unauthorized_api_key
- parser_unrecognized_frame
- internal_error
