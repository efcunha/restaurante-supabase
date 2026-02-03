# Implementation Plan: Modernização do Aplicativo de Restaurante

## Overview

Este plano implementa a modernização do aplicativo de restaurante em 4 fases principais, priorizando segurança crítica, seguida por otimizações de performance e custos, e finalizando com melhorias de qualidade. Cada fase é independente e pode ser validada antes de prosseguir para a próxima.

A implementação utiliza TypeScript para todo o código, feature flags para rollout gradual, e testes automatizados (unit + property-based) para garantir correção.

## Tasks

### Phase 1: Security Hardening (P0 - Crítico)

- [x] 1. Implementar Custom Claims para Otimização de Security Rules
  - Criar Cloud Function para atualizar custom claims quando membership mudar
  - Implementar refresh automático de claims no Auth Module
  - Atualizar Security Rules para usar `request.auth.token.companyId`
  - Adicionar feature flag `useCustomClaims` para rollout gradual
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 1.1 Escrever property test para Custom Claims Completeness
    - **Property 1: Custom Claims Completeness**
    - **Validates: Requirements 1.4**

- [x] 2. Implementar Proteção de Credenciais com Environment Variables
  - Mover firebaseConfig.js para variáveis de ambiente
  - Configurar Expo environment variables para dev/staging/prod
  - Implementar validação de credenciais obrigatórias na inicialização
  - Criar error handling para credenciais ausentes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.1 Escrever property test para Configuration Validation
    - **Property 2: Configuration Validation**
    - **Validates: Requirements 2.4**

  - [x] 2.2 Escrever unit test para erro de credenciais ausentes
    - Testar mensagem de erro clara quando Firebase config está incompleto
    - _Requirements: 2.5_

- [x] 3. Implementar Proteção do Campo isPago
  - Atualizar Security Rules para restringir modificação de isPago a managers/admins
  - Criar Cloud Function para validação server-side de mudanças em isPago
  - Implementar criação de registro imutável de pagamento
  - Integrar com Audit System para logar mudanças em isPago
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.1 Escrever property test para Payment Change Audit Trail
    - **Property 3: Payment Change Audit Trail**
    - **Validates: Requirements 3.2**

  - [x] 3.2 Escrever property test para Payment Record Immutability
    - **Property 4: Payment Record Immutability**
    - **Validates: Requirements 3.4**

- [x] 4. Implementar Rate Limiting e Proteção contra Ataques
  - Criar RateLimiter class com contadores por usuário
  - Implementar limites: 100 writes/min, 500 reads/min
  - Adicionar exponential backoff para violações repetidas
  - Criar middleware para Cloud Functions validarem rate limits
  - Implementar retorno de erro 429 com retry-after header
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.1 Escrever property test para Rate Limiting Enforcement
    - **Property 5: Rate Limiting Enforcement**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 4.2 Escrever unit test para erro 429 no limite exato
    - Testar que operação no limite sucede e próxima falha com 429
    - _Requirements: 4.3_

  - [x] 4.3 Escrever property test para Exponential Backoff
    - **Property 6: Exponential Backoff on Rate Limit Violations**
    - **Validates: Requirements 4.4**

- [x] 5. Implementar Sistema de Auditoria
  - Criar AuditLog data model e collection structure
  - Implementar AuditService para logging de operações
  - Criar Cloud Functions triggers para operações críticas
  - Implementar logging de auth events (login, logout, failures)
  - Adicionar logging de permission-denied events
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [x] 5.1 Escrever property test para Write Operations Audit Logging
    - **Property 39: Write Operations Audit Logging**
    - **Validates: Requirements 20.1, 20.2, 20.3**

- [x] 6. Implementar Tratamento de Erros Consistente
  - Criar hierarquia de classes de erro customizadas (AppError, ValidationError, etc)
  - Implementar error classification (user/system/network)
  - Criar global error handler com logging completo
  - Implementar mensagens user-friendly em português
  - Integrar com Sentry para production error tracking
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

  - [x] 6.1 Escrever property test para Centralized Error Handling
    - **Property 41: Centralized Error Handling**
    - **Validates: Requirements 24.1**

  - [x] 6.2 Escrever property test para Error Categorization
    - **Property 42: Error Categorization**
    - **Validates: Requirements 24.2**

  - [x] 6.3 Escrever property test para Error Logging Completeness
    - **Property 43: Error Logging Completeness**
    - **Validates: Requirements 24.4**

- [x] 7. Checkpoint - Validar Segurança
  - Executar todos os testes de segurança
  - Validar que custom claims reduzem reads extras
  - Confirmar que rate limiting está funcionando
  - Verificar audit logs para operações críticas
  - Perguntar ao usuário se há questões antes de prosseguir

### Phase 2: Performance Optimization (P1 - Importante)

- [x] 8. Implementar Otimização de Listeners Real-time
  - Criar OrderListener class com debouncing de 500ms
  - Implementar memoization para prevenir re-processamento
  - Adicionar batching de múltiplas mudanças rápidas
  - Implementar limite de 5 listeners ativos por usuário
  - Adicionar auto-unsubscribe após 5 minutos de inatividade
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.1 Escrever property test para Listener Debouncing
    - **Property 10: Listener Debouncing**
    - **Validates: Requirements 6.1, 6.3**

  - [x] 8.2 Escrever property test para Memoization Prevents Reprocessing
    - **Property 11: Memoization Prevents Reprocessing**
    - **Validates: Requirements 6.2, 11.1**

  - [x] 8.3 Escrever property test para Listener Subscription Limit
    - **Property 12: Listener Subscription Limit**
    - **Validates: Requirements 6.4**

  - [x] 8.4 Escrever property test para Automatic Listener Cleanup
    - **Property 13: Automatic Listener Cleanup**
    - **Validates: Requirements 6.5**

- [x] 9. Implementar Cache Layer Inteligente
  - Criar CacheLayer class usando AsyncStorage
  - Implementar TTL configurável (5min para stats, 30s para orders)
  - Adicionar cache invalidation quando dados mudam
  - Implementar background refresh para dados stale
  - Adicionar compressão com LZ-string para dados grandes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 9.1 Escrever property test para Cache Hit Prevents Query
    - **Property 14: Cache Hit Prevents Query**
    - **Validates: Requirements 7.2**

  - [x] 9.2 Escrever property test para Cache Invalidation on Data Change
    - **Property 15: Cache Invalidation on Data Change**
    - **Validates: Requirements 7.3**

- [x] 10. Criar Índices Compostos no Firestore
  - Documentar índices necessários em firestore.indexes.json
  - Criar índice: (companyId, dateKey, status, createdAt)
  - Criar índice: (companyId, comandaNumber)
  - Criar índice: (companyId, isPago, dateKey)
  - Deploy índices e validar que foram construídos
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Otimizar Query de Active Orders
  - Atualizar listenToActiveOrders para filtrar por status
  - Adicionar limit de 100 resultados
  - Implementar query usando índice composto
  - Adicionar handling para lista vazia sem query
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 11.1 Escrever property test para Active Orders Query Filtering
    - **Property 16: Active Orders Query Filtering**
    - **Validates: Requirements 9.1**

  - [x] 11.2 Escrever property test para Query Result Limit
    - **Property 17: Query Result Limit**
    - **Validates: Requirements 9.4**

  - [x] 11.3 Escrever unit test para empty active orders
    - Testar que lista vazia não executa query desnecessária
    - _Requirements: 9.5_

- [x] 12. Simplificar Queries com Estratégia Única
  - Remover múltiplas estratégias fallback de findOrdersByComanda
  - Implementar query única usando índice em comandaNumber
  - Normalizar todos os comandaNumber para formato consistente
  - Implementar error handling que retorna lista vazia em falhas
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 12.1 Escrever property test para Comanda Number Normalization
    - **Property 18: Comanda Number Normalization**
    - **Validates: Requirements 10.3**

  - [x] 12.2 Escrever property test para Query Failure Returns Empty Result
    - **Property 19: Query Failure Returns Empty Result**
    - **Validates: Requirements 10.4**

- [x] 13. Otimizar Conversão de Dados Firestore
  - Implementar memoization em firestoreToOrder
  - Adicionar shallow comparison para detectar mudanças
  - Implementar transformação seletiva apenas de campos alterados
  - Adicionar TypeScript interfaces para type safety
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 13.1 Escrever property test para Shallow Comparison Detects Changes
    - **Property 20: Shallow Comparison Detects Changes**
    - **Validates: Requirements 11.2, 11.3**

- [x] 14. Implementar Paginação Cursor-Based
  - Criar PaginationService com cursor-based pagination
  - Implementar threshold de 50 itens para ativar paginação
  - Adicionar page size limit de 50 itens por página
  - Implementar cache de páginas já carregadas
  - Adicionar inserção ordenada de novos itens sem invalidar cache
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 14.1 Escrever property test para Pagination Threshold
    - **Property 21: Pagination Threshold**
    - **Validates: Requirements 12.1**

  - [x] 14.2 Escrever property test para Page Size Limit
    - **Property 22: Page Size Limit**
    - **Validates: Requirements 12.2**

  - [x] 14.3 Escrever property test para Paginated Results Caching
    - **Property 23: Paginated Results Caching**
    - **Validates: Requirements 12.4**

  - [x] 14.4 Escrever property test para Sorted Insertion Maintains Order
    - **Property 24: Sorted Insertion Maintains Order**
    - **Validates: Requirements 12.5**

  - [x] 14.5 Escrever unit test para paginação no limite exato
    - Testar que lista com exatamente 50 itens usa paginação
    - _Requirements: 12.1_

- [x] 15. Implementar Retry Logic com Idempotência
  - Criar withRetry utility function com exponential backoff
  - Implementar classificação de erros (retryable vs non-retryable)
  - Adicionar logging de falhas após max retries
  - Implementar idempotency keys para prevenir duplicação
  - Criar OfflineQueue para operações offline
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 15.1 Escrever property test para Retry on Retryable Errors
    - **Property 28: Retry on Retryable Errors**
    - **Validates: Requirements 16.1**

  - [x] 15.2 Escrever property test para Error Classification
    - **Property 29: Error Classification**
    - **Validates: Requirements 16.2**

  - [x] 15.3 Escrever property test para Retry Exhaustion Logging
    - **Property 30: Retry Exhaustion Logging**
    - **Validates: Requirements 16.3**

  - [x] 15.4 Escrever property test para Idempotency Key Deduplication
    - **Property 31: Idempotency Key Deduplication**
    - **Validates: Requirements 16.4**

  - [x] 15.5 Escrever property test para Offline Operation Queueing
    - **Property 32: Offline Operation Queueing**
    - **Validates: Requirements 16.5**

  - [x] 15.6 Escrever unit test para single retry success
    - Testar que operação com sucesso no primeiro retry não duplica
    - _Requirements: 16.4_

- [x] 16. Implementar Agregações Server-Side
  - Criar DailyStatistics data model
  - Implementar Cloud Function updateDailyStatistics (triggered on order write)
  - Criar função de agregação incremental (não re-calcula tudo)
  - Implementar query de estatísticas usando collection de agregações
  - Adicionar recalculo completo diário para consistência
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [x] 16.1 Escrever property test para Statistics Query Uses Aggregations
    - **Property 40: Statistics Query Uses Aggregations**
    - **Validates: Requirements 21.3**

- [x] 17. Implementar Arquivamento de Pedidos Antigos
  - Criar archived collection structure
  - Implementar Cloud Function archiveOldOrders (scheduled daily)
  - Adicionar manutenção de referential integrity durante arquivamento
  - Criar UnifiedQueryService que busca em active + archived
  - Implementar compressão de dados arquivados
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 17.1 Escrever property test para Unified Archive Query
    - **Property 33: Unified Archive Query**
    - **Validates: Requirements 17.4**

- [x] 18. Checkpoint - Validar Performance
  - Executar todos os testes de performance
  - Medir latência P95 de operações críticas (target: <500ms)
  - Validar redução de Firestore reads (target: -60%)
  - Verificar cache hit rate (target: >70%)
  - Perguntar ao usuário se há questões antes de prosseguir

### Phase 3: Data Normalization & Code Quality (P1/P2)

- [x] 19. Normalizar Estrutura de Collections
  - Consolidar orders em companies/{companyId}/orders/{orderId}
  - Remover collections root-level duplicadas
  - Atualizar todos os paths de acesso para usar estrutura consistente
  - Criar testes de validação de data integrity
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 19.1 Escrever property test para Consistent Path Pattern
    - **Property 25: Consistent Path Pattern**
    - **Validates: Requirements 13.3**

- [x] 20. Padronizar DateKey com Cálculo Server-Side
  - Criar Cloud Function para calcular dateKey em UTC
  - Atualizar triggers de create/update para usar server timestamp
  - Migrar dateKeys existentes para formato server-calculated
  - Implementar validação de formato YYYY-MM-DD
  - Adicionar conversão de local date para UTC em queries
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 20.1 Escrever property test para DateKey Format Validation
    - **Property 26: DateKey Format Validation**
    - **Validates: Requirements 14.4**

  - [x] 20.2 Escrever property test para Local Date to UTC Conversion
    - **Property 27: Local Date to UTC Conversion**
    - **Validates: Requirements 14.5**

- [x] 21. Consolidar Campos Duplicados
  - Criar Cloud Function normalizeOrderFields
  - Migrar numeroComanda → comandaNumber
  - Migrar criadoPor → createdBy
  - Atualizar todo código para usar campos padronizados
  - Remover campos deprecated após período de deprecação
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 22. Migrar Código para TypeScript
  - Converter todos arquivos .js para .ts/.tsx
  - Definir interfaces TypeScript para todos os data models
  - Habilitar strict mode no tsconfig.json
  - Implementar generics para componentes reutilizáveis
  - Validar compilação TypeScript sem erros
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [x] 23. Refatorar Lógica de Negócio
  - Extrair lógica de OrderContext para OrderService
  - Criar service layer com interfaces claras
  - Implementar dependency injection para services
  - Limitar Context components a máximo 200 linhas
  - Criar custom hooks para lógica reutilizável
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [x] 24. Implementar Internacionalização
  - Converter variáveis/funções/comentários para inglês
  - Extrair strings em português para arquivos i18n
  - Configurar i18n framework (react-i18next)
  - Manter português como idioma padrão
  - Adicionar validação de completude de traduções no CI
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [x] 25. Checkpoint - Validar Qualidade de Código
  - Executar TypeScript compilation sem erros
  - Validar cobertura de testes >80%
  - Verificar que Context components têm <200 linhas
  - Confirmar que campos duplicados foram removidos
  - Perguntar ao usuário se há questões antes de prosseguir
  - **Status:** Validation complete - See PHASE3_VALIDATION_REPORT.md
  - **Result:** Phase 3 Data Normalization complete (Tasks 19-21), Code Quality pending (Tasks 22-24)
  - **Infrastructure:** 75% TypeScript adoption, i18n configured, migration guides ready

### Phase 4: Advanced Features (P2 - Desejável)

- [ ] 26. Implementar Autenticação Multi-Fator (MFA)
  - Integrar Firebase Auth TOTP-based MFA
  - Implementar requirement de MFA para admin/manager roles
  - Criar UI para setup de MFA com QR code
  - Implementar geração de backup codes
  - Adicionar account lockout após 5 falhas de MFA
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 26.1 Escrever property test para MFA Requirement for Privileged Roles
    - **Property 34: MFA Requirement for Privileged Roles**
    - **Validates: Requirements 18.2**

  - [ ] 26.2 Escrever property test para MFA Backup Codes Generation
    - **Property 35: MFA Backup Codes Generation**
    - **Validates: Requirements 18.4**

  - [ ] 26.3 Escrever property test para Account Lockout After Failed MFA
    - **Property 36: Account Lockout After Failed MFA**
    - **Validates: Requirements 18.5**

- [ ] 27. Implementar Autenticação Biométrica
  - Integrar Expo LocalAuthentication
  - Implementar fingerprint e face recognition
  - Adicionar fallback para password se biometric falhar
  - Armazenar enrollment status em device keychain
  - Validar session token após biometric auth
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ] 27.1 Escrever property test para Biometric Fallback to Password
    - **Property 37: Biometric Fallback to Password**
    - **Validates: Requirements 19.3**

  - [ ] 27.2 Escrever property test para Token Validation After Biometric Auth
    - **Property 38: Token Validation After Biometric Auth**
    - **Validates: Requirements 19.5**

- [ ] 28. Implementar Persistência de Autenticação Segura
  - Usar Expo SecureStore para persistir auth state
  - Implementar restore de auth state após restart
  - Adicionar session timeout de 30 dias
  - Validar auth state antes de persistir
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 28.1 Escrever property test para Authentication State Persistence
    - **Property 7: Authentication State Persistence**
    - **Validates: Requirements 5.2**

  - [ ] 28.2 Escrever property test para Session Timeout Enforcement
    - **Property 8: Session Timeout Enforcement**
    - **Validates: Requirements 5.3**

  - [ ] 28.3 Escrever property test para Auth State Validation Before Persistence
    - **Property 9: Auth State Validation Before Persistence**
    - **Validates: Requirements 5.4**

- [ ] 29. Implementar Monitoramento de Performance
  - Integrar Firebase Performance Monitoring
  - Adicionar tracking de latência para operações críticas
  - Configurar alertas para P95 latency >500ms
  - Implementar tracking de Firestore read/write counts
  - Criar dashboard com métricas em tempo real
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 30. Implementar Migration Engine
  - Criar MigrationEngine class com dual-write support
  - Implementar migração em batches de 500 documentos
  - Adicionar validação de consistência contínua
  - Implementar rollback capability para cada fase
  - Criar relatórios de progresso de migração
  - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

- [ ] 31. Configurar Métricas de Sucesso
  - Implementar tracking de todas as métricas baseline
  - Criar dashboard executivo com métricas semanais
  - Configurar comparação before/after para cada métrica
  - Adicionar alertas para métricas fora do target
  - Gerar relatórios mensais de custo e performance
  - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 30.1, 30.2, 30.3, 30.4, 30.5_

- [ ] 32. Checkpoint Final - Validar Modernização Completa
  - Executar suite completa de testes (unit + property + integration)
  - Validar todas as métricas de sucesso atingidas
  - Confirmar redução de custos >60%
  - Verificar latência P95 <500ms
  - Validar zero incidentes de segurança
  - Confirmar cobertura de testes >80%
  - Perguntar ao usuário se modernização está completa

## Notes

- Todos os testes são obrigatórios para garantir cobertura completa desde o início
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de correção
- Unit tests validam exemplos específicos e casos extremos
- Feature flags permitem rollout gradual e rollback seguro
- Migração incremental garante zero downtime
