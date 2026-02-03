# Requirements Document - Modernização do Aplicativo de Restaurante

## Introduction

Este documento especifica os requisitos para modernização e otimização de um aplicativo React Native/Expo para gestão de restaurante. O sistema atual enfrenta problemas críticos de segurança, performance, custos de infraestrutura e manutenibilidade que impedem sua operação em escala profissional. A modernização visa transformar o aplicativo em uma solução enterprise-grade com latência reduzida, custos otimizados, segurança robusta e código sustentável.

## Glossary

- **Sistema**: O aplicativo de gestão de restaurante (React Native + Firebase)
- **Firestore**: Banco de dados NoSQL do Firebase usado como backend
- **Auth_Module**: Módulo de autenticação e autorização do Firebase
- **Order_Listener**: Componente que monitora pedidos em tempo real via onSnapshot
- **Security_Rules**: Regras de segurança do Firestore que validam operações
- **Cache_Layer**: Camada de cache local usando AsyncStorage
- **Query_Optimizer**: Componente responsável por otimizar queries ao Firestore
- **Migration_Engine**: Sistema responsável por migração incremental de dados
- **Audit_System**: Sistema de auditoria de operações e acessos
- **Rate_Limiter**: Componente que limita taxa de requisições por usuário
- **Tenant**: Empresa/restaurante no sistema multi-tenant (companyId)
- **Comanda**: Identificador de mesa/pedido no restaurante
- **DateKey**: Chave de data no formato YYYY-MM-DD para particionamento
- **Offline_Queue**: Fila de operações pendentes para sincronização offline

## Requirements

### Requirement 1: Otimização de Segurança do Firestore

**User Story:** Como administrador do sistema, eu quero que as regras de segurança do Firestore sejam otimizadas, para que não haja reads extras desnecessários e a validação seja eficiente.

#### Acceptance Criteria

1. WHEN a Security_Rules validates a user operation, THE Sistema SHALL perform validation without additional document reads beyond the operation itself
2. WHEN a user attempts an operation, THE Security_Rules SHALL use custom claims in the auth token to validate tenant membership
3. WHEN Security_Rules are deployed, THE Sistema SHALL maintain backward compatibility during migration period
4. THE Auth_Module SHALL include companyId and role in custom claims for all authenticated users
5. WHEN a user's company membership changes, THE Sistema SHALL refresh custom claims within 5 minutes

### Requirement 2: Proteção de Credenciais e Secrets

**User Story:** Como desenvolvedor de segurança, eu quero que credenciais sensíveis sejam protegidas adequadamente, para que não haja exposição de secrets no código ou repositório.

#### Acceptance Criteria

1. THE Sistema SHALL store Firebase configuration in environment variables managed by Expo's secure environment system
2. WHEN the application builds, THE Sistema SHALL inject credentials at build time without including them in source code
3. THE Sistema SHALL use different Firebase projects for development, staging, and production environments
4. WHEN accessing sensitive configuration, THE Sistema SHALL validate that required environment variables are present
5. THE Sistema SHALL fail gracefully with clear error messages if required credentials are missing

### Requirement 3: Proteção do Campo isPago

**User Story:** Como gerente de restaurante, eu quero que o status de pagamento dos pedidos seja protegido contra manipulação, para que apenas operações autorizadas possam modificá-lo.

#### Acceptance Criteria

1. WHEN a client attempts to modify the isPago field, THE Security_Rules SHALL reject the operation unless the user has manager or admin role
2. WHEN a payment status changes, THE Audit_System SHALL log the operation with user, timestamp, and previous value
3. THE Sistema SHALL validate isPago changes server-side using Cloud Functions before committing to Firestore
4. WHEN a payment is marked as complete, THE Sistema SHALL create an immutable payment record in a separate collection
5. IF an unauthorized isPago modification is detected, THEN THE Sistema SHALL alert administrators and revert the change

### Requirement 4: Rate Limiting e Proteção contra Ataques

**User Story:** Como administrador de infraestrutura, eu quero proteção contra ataques de negação de serviço, para que o sistema permaneça disponível sob carga maliciosa.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL limit each user to maximum 100 write operations per minute
2. THE Rate_Limiter SHALL limit each user to maximum 500 read operations per minute
3. WHEN rate limits are exceeded, THE Sistema SHALL return error code 429 with retry-after header
4. THE Rate_Limiter SHALL use exponential backoff for repeated violations
5. WHEN suspicious patterns are detected, THE Sistema SHALL temporarily block the user and alert administrators

### Requirement 5: Persistência de Autenticação Segura

**User Story:** Como usuário do aplicativo, eu quero permanecer autenticado entre sessões, para que não precise fazer login repetidamente.

#### Acceptance Criteria

1. THE Auth_Module SHALL persist authentication state securely using Expo SecureStore
2. WHEN the application restarts, THE Auth_Module SHALL restore authentication state without requiring re-login
3. THE Auth_Module SHALL implement session timeout of 30 days for inactive users
4. WHEN authentication state changes, THE Sistema SHALL validate the change before updating persisted state
5. THE Auth_Module SHALL support biometric authentication for quick re-authentication

### Requirement 6: Otimização de Listeners Real-time

**User Story:** Como desenvolvedor de performance, eu quero que listeners real-time sejam otimizados, para que não causem re-renders excessivos e consumo desnecessário de recursos.

#### Acceptance Criteria

1. WHEN data changes in Firestore, THE Order_Listener SHALL debounce updates with minimum 500ms delay
2. THE Order_Listener SHALL use memoization to prevent re-processing of unchanged data
3. WHEN multiple changes occur rapidly, THE Order_Listener SHALL batch updates into single state change
4. THE Sistema SHALL limit active listeners to maximum 5 concurrent subscriptions per user
5. WHEN a listener is inactive for 5 minutes, THE Sistema SHALL automatically unsubscribe to save resources

### Requirement 7: Otimização de Cache de Estatísticas

**User Story:** Como gerente de restaurante, eu quero que estatísticas sejam carregadas rapidamente, para que possa tomar decisões baseadas em dados atualizados.

#### Acceptance Criteria

1. THE Cache_Layer SHALL cache statistical queries for minimum 5 minutes
2. WHEN cached data exists and is valid, THE Sistema SHALL return cached results without querying Firestore
3. THE Cache_Layer SHALL implement cache invalidation when relevant data changes
4. WHEN cache is stale, THE Sistema SHALL fetch fresh data in background while serving cached data
5. THE Sistema SHALL pre-compute daily statistics using Cloud Functions and store in aggregated collections

### Requirement 8: Criação de Índices Compostos

**User Story:** Como administrador de banco de dados, eu quero índices compostos otimizados, para que queries complexas executem eficientemente.

#### Acceptance Criteria

1. THE Sistema SHALL create composite indexes for all queries used in production
2. WHEN deploying index changes, THE Migration_Engine SHALL validate indexes are built before switching traffic
3. THE Sistema SHALL monitor query performance and alert when queries lack appropriate indexes
4. THE Query_Optimizer SHALL analyze query patterns monthly and recommend new indexes
5. THE Sistema SHALL document all required indexes in firestore.indexes.json

### Requirement 9: Otimização de listenToActiveOrders

**User Story:** Como desenvolvedor de performance, eu quero que a função listenToActiveOrders seja otimizada, para que não processe todos os pedidos desnecessariamente.

#### Acceptance Criteria

1. WHEN listening to active orders, THE Order_Listener SHALL query only orders with status 'pending' or 'preparing'
2. THE Order_Listener SHALL use composite index on (companyId, dateKey, status, timestamp)
3. WHEN orders are completed, THE Sistema SHALL move them to archived collection after 24 hours
4. THE Order_Listener SHALL limit results to maximum 100 most recent active orders
5. WHEN no active orders exist, THE Order_Listener SHALL use empty state without querying Firestore

### Requirement 10: Simplificação de Queries Fallback

**User Story:** Como desenvolvedor de manutenção, eu quero que queries tenham estratégia única e eficiente, para que o código seja simples e performático.

#### Acceptance Criteria

1. THE Query_Optimizer SHALL use single optimized query strategy instead of multiple fallbacks
2. WHEN searching by comanda number, THE Sistema SHALL use indexed query on comandaNumber field only
3. THE Sistema SHALL normalize all comanda identifiers to single consistent format during data migration
4. WHEN a query fails, THE Sistema SHALL log the failure and return empty result instead of trying alternative strategies
5. THE Query_Optimizer SHALL validate query performance in development environment before deployment

### Requirement 11: Otimização de Conversão de Dados

**User Story:** Como desenvolvedor de performance, eu quero que conversão de dados seja eficiente, para que não cause overhead em cada snapshot.

#### Acceptance Criteria

1. THE Sistema SHALL memoize conversion functions to avoid re-processing identical data
2. WHEN converting Firestore documents, THE Sistema SHALL use shallow comparison to detect actual changes
3. THE Sistema SHALL perform data transformation only for fields that changed since last snapshot
4. THE Sistema SHALL use TypeScript interfaces to ensure type safety without runtime overhead
5. WHEN large datasets are converted, THE Sistema SHALL use Web Workers for parallel processing

### Requirement 12: Implementação de Paginação

**User Story:** Como usuário do aplicativo, eu quero que listas grandes carreguem rapidamente, para que possa navegar pelo histórico sem lentidão.

#### Acceptance Criteria

1. THE Sistema SHALL implement cursor-based pagination for all lists with more than 50 items
2. WHEN loading a paginated list, THE Sistema SHALL fetch maximum 50 items per page
3. THE Sistema SHALL provide infinite scroll with automatic loading of next page when user reaches bottom
4. THE Sistema SHALL cache paginated results to avoid re-fetching when user navigates back
5. WHEN new items are added, THE Sistema SHALL insert them at appropriate position without invalidating entire cache

### Requirement 13: Normalização de Estrutura de Dados

**User Story:** Como arquiteto de dados, eu quero estrutura de dados consistente, para que não haja confusão entre collections root e nested.

#### Acceptance Criteria

1. THE Migration_Engine SHALL consolidate all order data into single collection structure: companies/{companyId}/orders/{orderId}
2. THE Sistema SHALL eliminate duplicate root-level collections during migration
3. WHEN accessing order data, THE Sistema SHALL use consistent path pattern across all queries
4. THE Migration_Engine SHALL validate data integrity after migration with automated tests
5. THE Sistema SHALL maintain migration rollback capability for 30 days after completion

### Requirement 14: Padronização de DateKey

**User Story:** Como desenvolvedor de backend, eu quero que dateKey seja calculado de forma consistente, para que não haja inconsistências de timezone.

#### Acceptance Criteria

1. THE Sistema SHALL calculate dateKey server-side using Cloud Functions in UTC timezone
2. WHEN creating or updating orders, THE Sistema SHALL set dateKey using server timestamp
3. THE Sistema SHALL migrate existing dateKey values to server-calculated format
4. THE Sistema SHALL validate dateKey format matches YYYY-MM-DD pattern
5. WHEN querying by date, THE Sistema SHALL convert user's local date to UTC for consistent results

### Requirement 15: Eliminação de Campos Duplicados

**User Story:** Como desenvolvedor de manutenção, eu quero campos únicos e bem nomeados, para que não haja confusão sobre qual campo usar.

#### Acceptance Criteria

1. THE Migration_Engine SHALL consolidate numeroComanda and comandaNumber into single comandaNumber field
2. THE Migration_Engine SHALL consolidate criadoPor and createdBy into single createdBy field
3. WHEN migrating fields, THE Sistema SHALL preserve data from both fields using merge strategy
4. THE Sistema SHALL update all code references to use standardized field names
5. THE Migration_Engine SHALL remove deprecated fields after 90-day deprecation period

### Requirement 16: Implementação de Retry Logic

**User Story:** Como desenvolvedor de confiabilidade, eu quero que transações falhas sejam retentadas automaticamente, para que erros temporários não causem falhas permanentes.

#### Acceptance Criteria

1. WHEN a transaction fails with retryable error, THE Sistema SHALL retry up to 3 times with exponential backoff
2. THE Sistema SHALL identify retryable errors (network, timeout, contention) vs non-retryable errors (permission, validation)
3. WHEN maximum retries are exceeded, THE Sistema SHALL log the failure and notify the user
4. THE Sistema SHALL implement idempotency keys to prevent duplicate operations during retries
5. WHEN offline, THE Offline_Queue SHALL queue operations for retry when connection is restored

### Requirement 17: Arquivamento de Pedidos Antigos

**User Story:** Como administrador de banco de dados, eu quero que pedidos antigos sejam arquivados, para que a collection principal permaneça performática.

#### Acceptance Criteria

1. THE Sistema SHALL move orders older than 90 days to archived collection using Cloud Functions
2. THE Sistema SHALL run archival process daily during low-traffic hours
3. WHEN archiving orders, THE Sistema SHALL maintain referential integrity with related documents
4. THE Sistema SHALL provide query interface that searches both active and archived collections transparently
5. THE Sistema SHALL compress archived data to reduce storage costs by minimum 50%

### Requirement 18: Autenticação Multi-Fator (MFA)

**User Story:** Como gerente de segurança, eu quero autenticação multi-fator, para que contas de usuários sejam protegidas contra acesso não autorizado.

#### Acceptance Criteria

1. THE Auth_Module SHALL support TOTP-based MFA using authenticator apps
2. THE Auth_Module SHALL require MFA for users with admin or manager roles
3. WHEN enabling MFA, THE Sistema SHALL provide QR code for easy setup
4. THE Auth_Module SHALL generate backup codes for account recovery
5. WHEN MFA verification fails 5 times, THE Sistema SHALL temporarily lock the account and notify administrators

### Requirement 19: Autenticação Biométrica

**User Story:** Como usuário do aplicativo, eu quero usar autenticação biométrica, para que possa acessar rapidamente sem digitar senha.

#### Acceptance Criteria

1. THE Auth_Module SHALL support fingerprint and face recognition using Expo LocalAuthentication
2. WHEN biometric authentication is available, THE Sistema SHALL offer it as login option
3. THE Auth_Module SHALL fall back to password authentication if biometric fails
4. THE Sistema SHALL store biometric enrollment status securely in device keychain
5. WHEN biometric authentication succeeds, THE Sistema SHALL validate session token is still valid before granting access

### Requirement 20: Sistema de Auditoria

**User Story:** Como auditor de compliance, eu quero registro completo de operações, para que possa rastrear todas as ações no sistema.

#### Acceptance Criteria

1. THE Audit_System SHALL log all write operations with user, timestamp, operation type, and affected documents
2. THE Audit_System SHALL log all authentication events including login, logout, and failed attempts
3. THE Audit_System SHALL log all permission-denied events with attempted operation details
4. THE Audit_System SHALL store audit logs in separate collection with 7-year retention
5. THE Audit_System SHALL provide query interface for administrators to search audit logs

### Requirement 21: Agregações Server-Side

**User Story:** Como desenvolvedor de performance, eu quero que estatísticas sejam calculadas no servidor, para que não sobrecarreguem o cliente e reduzam reads.

#### Acceptance Criteria

1. THE Sistema SHALL calculate daily statistics using Cloud Functions triggered by order changes
2. THE Sistema SHALL store aggregated statistics in dedicated collection: companies/{companyId}/statistics/{dateKey}
3. WHEN displaying statistics, THE Sistema SHALL query pre-computed aggregations instead of raw orders
4. THE Sistema SHALL update aggregations incrementally when orders change
5. THE Sistema SHALL recalculate full statistics daily to ensure consistency

### Requirement 22: Migração de JavaScript para TypeScript

**User Story:** Como desenvolvedor de qualidade, eu quero código totalmente tipado, para que erros sejam detectados em tempo de compilação.

#### Acceptance Criteria

1. THE Sistema SHALL convert all .js files to .tsx or .ts with strict TypeScript configuration
2. THE Sistema SHALL define TypeScript interfaces for all data models
3. THE Sistema SHALL enable strict mode with no implicit any types
4. THE Sistema SHALL use TypeScript generics for reusable components and functions
5. THE Sistema SHALL validate TypeScript compilation passes without errors in CI/CD pipeline

### Requirement 23: Refatoração de Lógica de Negócio

**User Story:** Como desenvolvedor de manutenção, eu quero lógica de negócio separada de UI, para que o código seja testável e reutilizável.

#### Acceptance Criteria

1. THE Sistema SHALL extract business logic from Context components into separate service modules
2. THE Sistema SHALL implement service layer with clear interfaces for data operations
3. THE Sistema SHALL use dependency injection to provide services to components
4. THE Sistema SHALL limit Context components to maximum 200 lines of code
5. THE Sistema SHALL implement custom hooks for reusable business logic

### Requirement 24: Tratamento de Erros Consistente

**User Story:** Como desenvolvedor de confiabilidade, eu quero tratamento de erros padronizado, para que usuários recebam mensagens claras e erros sejam logados adequadamente.

#### Acceptance Criteria

1. THE Sistema SHALL implement centralized error handling with custom error classes
2. THE Sistema SHALL categorize errors as user errors, system errors, or network errors
3. WHEN an error occurs, THE Sistema SHALL display user-friendly message in Portuguese
4. THE Sistema SHALL log all errors with stack trace, context, and user information
5. THE Sistema SHALL integrate with error monitoring service (Sentry or similar) for production tracking

### Requirement 25: Implementação de Testes Automatizados

**User Story:** Como engenheiro de qualidade, eu quero cobertura de testes abrangente, para que mudanças não introduzam regressões.

#### Acceptance Criteria

1. THE Sistema SHALL achieve minimum 80% code coverage for business logic modules
2. THE Sistema SHALL implement unit tests for all service layer functions
3. THE Sistema SHALL implement integration tests for critical user flows
4. THE Sistema SHALL implement property-based tests for data transformation functions
5. THE Sistema SHALL run all tests automatically in CI/CD pipeline before deployment

### Requirement 26: Internacionalização de Código

**User Story:** Como desenvolvedor de padrões, eu quero código em inglês, para que seja mantível por equipe internacional.

#### Acceptance Criteria

1. THE Sistema SHALL use English for all variable names, function names, and comments
2. THE Sistema SHALL extract Portuguese strings to i18n translation files
3. THE Sistema SHALL support multiple languages through i18n framework
4. THE Sistema SHALL maintain Portuguese as default language for user-facing text
5. THE Sistema SHALL validate translation completeness in CI/CD pipeline

### Requirement 27: Monitoramento de Performance

**User Story:** Como engenheiro de SRE, eu quero métricas de performance em tempo real, para que possa identificar e resolver problemas rapidamente.

#### Acceptance Criteria

1. THE Sistema SHALL track latency for all critical operations (create order, update status, load statistics)
2. THE Sistema SHALL alert when p95 latency exceeds 500ms for any operation
3. THE Sistema SHALL track Firestore read/write counts per user session
4. THE Sistema SHALL monitor cache hit rates and alert when below 70%
5. THE Sistema SHALL provide dashboard with real-time performance metrics

### Requirement 28: Otimização de Custos

**User Story:** Como gerente de produto, eu quero custos de infraestrutura reduzidos, para que o aplicativo seja economicamente viável em escala.

#### Acceptance Criteria

1. THE Sistema SHALL reduce Firestore reads by minimum 60% through caching and aggregations
2. THE Sistema SHALL reduce Firestore writes by minimum 30% through batching and deduplication
3. THE Sistema SHALL use Cloud Functions with appropriate memory allocation to minimize costs
4. THE Sistema SHALL implement data lifecycle policies to delete or archive old data automatically
5. THE Sistema SHALL provide monthly cost report with breakdown by operation type

### Requirement 29: Plano de Migração Incremental

**User Story:** Como engenheiro de DevOps, eu quero migração sem downtime, para que usuários não sejam impactados durante a modernização.

#### Acceptance Criteria

1. THE Migration_Engine SHALL support dual-write mode where changes are written to both old and new structures
2. THE Migration_Engine SHALL validate data consistency between old and new structures continuously
3. THE Migration_Engine SHALL provide rollback capability at each migration phase
4. THE Migration_Engine SHALL migrate data in batches of maximum 500 documents to avoid timeouts
5. THE Migration_Engine SHALL complete full migration within maximum 30 days with zero downtime

### Requirement 30: Métricas de Sucesso

**User Story:** Como gerente de produto, eu quero métricas claras de sucesso, para que possa validar que a modernização atingiu seus objetivos.

#### Acceptance Criteria

1. THE Sistema SHALL measure and report p95 latency for critical operations before and after modernization
2. THE Sistema SHALL measure and report monthly Firestore costs before and after modernization
3. THE Sistema SHALL measure and report security incidents before and after modernization
4. THE Sistema SHALL measure and report code quality metrics (test coverage, TypeScript adoption) before and after modernization
5. THE Sistema SHALL provide executive dashboard with all success metrics updated weekly
