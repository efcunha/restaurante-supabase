# 05 - Seguranca, LGPD e observabilidade

## 1. Guardrails de seguranca

### 1.1 Secrets

- Nenhum segredo em codigo-fonte.
- API key do bridge nunca em EXPO_PUBLIC.
- Segredos somente em ambiente seguro server-side ou armazenamento protegido.

### 1.2 Multi-tenant

- company_id obrigatorio em toda operacao de configuracao.
- RLS como camada obrigatoria de isolamento.
- Validacao de role para operacoes administrativas.

### 1.3 Superficie de ataque do bridge

- API local em LAN deve ter controle de origem e opcao de chave.
- CORS configurado com criterio; evitar exposicao ampla sem necessidade.
- Bloquear verbos e rotas nao utilizados.

### 1.4 Sanitizacao e validacao

- Validar payloads de comando (ex: tara).
- Limitar tamanho de strings de quadro bruto.
- Tratar entradas inesperadas do parser sem excecao fatal.

## 2. LGPD

- Nao coletar PII desnecessario no fluxo de balanca.
- Nao registrar identificadores pessoais em logs tecnicos.
- Garantir trilha de auditoria sem expor dado sensivel.

## 3. Logging seguro

- Mascarar dados sensiveis quando existirem.
- Nao logar API key, tokens ou credenciais.
- Adotar niveis de log (info, warn, error) com contexto minimo necessario.

## 4. Observabilidade recomendada

### 4.1 Metricas

- taxa_sucesso_leitura
- latencia_media_peso_estavel
- taxa_timeout_leitura_estavel
- taxa_erros_bridge
- reconexoes_serial_por_hora

### 4.2 Eventos

- balanca_connected
- balanca_disconnected
- leitura_estavel_recebida
- leitura_instavel_recebida
- tara_enviada
- timeout_peso_estavel
- fallback_manual_acionado

### 4.3 Alertas

- Percentual de erro acima de baseline por tenant.
- Ausencia de leitura por janela prolongada em horario comercial.
- Picos de reconexao serial indicando instabilidade fisica.

## 5. Checklist de seguranca para go-live futuro

- Sem hardcode de segredo.
- RLS validada nas tabelas novas.
- CORS revisado para ambiente alvo.
- Logs revisados sem PII.
- Teste de acesso cross-tenant bloqueado.
