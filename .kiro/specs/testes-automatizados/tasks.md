# Implementation Plan: Sistema de Testes Automatizados

## Overview

Este plano detalha a implementação de uma suite completa de testes automatizados para o aplicativo React Native + Expo do restaurante. A implementação será dividida em tarefas incrementais, começando pela configuração da infraestrutura, seguida pelos testes de Services, Utils, Hooks e Components, culminando com testes de integração e configuração de CI/CD.

**Meta de Cobertura**: 70%+ global (Services 80%+, Utils 90%+, Hooks 70%+, Components 60%+)

---

## Tasks

- [ ] 1. Configurar infraestrutura de testes
  - Instalar dependências (Jest, React Native Testing Library, fast-check)
  - Criar jest.config.js com configurações de cobertura
  - Configurar setup global de testes (jest.setup.js)
  - Criar utilitários de teste (test-utils.js)
  - Configurar mocks de módulos nativos
  - _Requirements: RNF-001, RNF-002, RNF-003, RNF-004_

- [ ] 2. Implementar testes de OrderService
  - [ ] 2.1 Criar testes unitários para OrderService
    - Testar calculateOrderTotal com múltiplos cenários
    - Testar extractQuantity para diferentes formatos
    - Testar createOrder com todos os parâmetros
    - Testar updateOrderStatus para todas as transições
    - Testar updateItemStatus para itens individuais
    - Testar validações (validateDelete, allItemsReady)
    - _Requirements: RF-001_
  
  - [ ]* 2.2 Escrever property test para cálculo de total
    - **Property 1: Total Calculation Correctness**
    - **Validates: Requirements RF-001**
  
  - [ ]* 2.3 Escrever property test para extração de quantidade
    - **Property 2: Quantity Extraction Consistency**
    - **Validates: Requirements RF-001**
  
  - [ ]* 2.4 Escrever property test para transições de status
    - **Property 3: Order Status Transition Validity**
    - **Validates: Requirements RF-001**
  
  - [ ]* 2.5 Escrever property test para status de itens
    - **Property 4: Item Status Independence**
    - **Validates: Requirements RF-001**


- [ ] 3. Implementar testes de ComandasService
  - [ ] 3.1 Criar testes unitários para ComandasService
    - Testar ensureComandaAberta (criação e reabertura)
    - Testar adicionarConsumo com diferentes valores
    - Testar fecharComanda (sucesso e falha com saldo)
    - Testar listarComandasAbertas
    - Testar sincronizarTotalComanda
    - Mockar Firebase transactions
    - _Requirements: RF-002_
  
  - [ ]* 3.2 Escrever property test para criação idempotente
    - **Property 5: Comanda Creation Idempotence**
    - **Validates: Requirements RF-002**
  
  - [ ]* 3.3 Escrever property test para adição de consumo
    - **Property 6: Consumption Addition Correctness**
    - **Validates: Requirements RF-002**
  
  - [ ]* 3.4 Escrever property test para validação de fechamento
    - **Property 7: Comanda Closure Validation**
    - **Validates: Requirements RF-002**

- [ ] 4. Implementar testes de PagamentosService
  - [ ] 4.1 Criar testes unitários para PagamentosService
    - Testar registro de pagamentos válidos
    - Testar rejeição de valores inválidos
    - Testar validação de formas de pagamento
    - Testar marcação de pedidos como pagos
    - Mockar Firebase operations
    - _Requirements: RF-003_
  
  - [ ]* 4.2 Escrever property test para validação de valor
    - **Property 8: Payment Value Validation**
    - **Validates: Requirements RF-003**
  
  - [ ]* 4.3 Escrever property test para validação de forma de pagamento
    - **Property 9: Payment Form Validation**
    - **Validates: Requirements RF-003**


- [ ] 5. Implementar testes de CaixaService
  - [ ] 5.1 Criar testes unitários para CaixaService
    - Testar abertura de caixa
    - Testar registro de vendas
    - Testar reforços e sangrias
    - Testar fechamento de caixa
    - Testar cálculo de totais
    - Mockar Firebase operations
    - _Requirements: RF-004_
  
  - [ ]* 5.2 Escrever property test para abertura única
    - **Property 10: Cash Register Opening Uniqueness**
    - **Validates: Requirements RF-004**
  
  - [ ]* 5.3 Escrever property test para registro de vendas
    - **Property 11: Sales Recording Accuracy**
    - **Validates: Requirements RF-004**
  
  - [ ]* 5.4 Escrever property test para fechamento
    - **Property 12: Cash Register Closure Completeness**
    - **Validates: Requirements RF-004**

- [ ] 6. Checkpoint - Verificar cobertura de Services
  - Executar `npm run test:coverage`
  - Verificar que Services têm 80%+ de cobertura
  - Corrigir testes falhando se necessário
  - Perguntar ao usuário se há dúvidas


- [ ] 7. Implementar testes de dateUtils
  - [ ] 7.1 Criar testes unitários para dateUtils
    - Testar getLocalDateKey com diferentes datas
    - Testar formato de saída (YYYY-MM-DD)
    - Testar aliases (todayKey, dateKey)
    - Usar jest.useFakeTimers() para controlar datas
    - _Requirements: RF-005_
  
  - [ ]* 7.2 Escrever property test para formato consistente
    - **Property 13: Date Key Format Consistency**
    - **Validates: Requirements RF-005**
  
  - [ ]* 7.3 Escrever property test para determinismo
    - **Property 14: Date Function Determinism**
    - **Validates: Requirements RF-005**

- [ ] 8. Implementar testes de validation
  - [ ] 8.1 Criar testes unitários para validation
    - Testar sanitizeString com HTML e caracteres especiais
    - Testar validateClientName (válido e inválido)
    - Testar validatePrice (positivo, negativo, limites)
    - Testar validateQuantity
    - Testar validateObservations
    - Testar validateOrderItems
    - Testar validateCPF e validateCNPJ
    - Testar validateEmail
    - Testar validateCompleteOrder
    - _Requirements: RF-006_
  
  - [ ]* 8.2 Escrever property test para sanitização
    - **Property 15: Input Sanitization Safety**
    - **Validates: Requirements RF-006**
  
  - [ ]* 8.3 Escrever property test para aceitação de inputs válidos
    - **Property 16: Valid Input Acceptance**
    - **Validates: Requirements RF-006**
  
  - [ ]* 8.4 Escrever property test para rejeição de inputs inválidos
    - **Property 17: Invalid Input Rejection**
    - **Validates: Requirements RF-006**
  
  - [ ]* 8.5 Escrever property test para precisão de preço
    - **Property 18: Price Validation Precision**
    - **Validates: Requirements RF-006**


- [ ] 9. Implementar testes de orderCalculator
  - [ ] 9.1 Criar testes unitários para orderCalculator
    - Testar cálculo de totais
    - Testar parsing de quantidades
    - Testar matching de preços
    - Testar edge cases (arrays vazios, valores zero)
    - _Requirements: RF-007_
  
  - [ ]* 9.2 Escrever property test para comutatividade
    - **Property 19: Total Calculation Commutativity**
    - **Validates: Requirements RF-007**
  
  - [ ]* 9.3 Escrever property test para parsing robusto
    - **Property 20: Quantity Parsing Robustness**
    - **Validates: Requirements RF-007**

- [ ] 10. Checkpoint - Verificar cobertura de Utils
  - Executar `npm run test:coverage`
  - Verificar que Utils têm 90%+ de cobertura
  - Corrigir testes falhando se necessário
  - Perguntar ao usuário se há dúvidas

- [ ] 11. Implementar testes de useNovoPedido
  - [ ] 11.1 Criar testes unitários para useNovoPedido
    - Testar inicialização do hook
    - Testar adição de produtos
    - Testar remoção de produtos
    - Testar atualização de quantidade
    - Testar cálculo de total
    - Testar limpeza de pedido
    - Usar renderHook e act()
    - _Requirements: RF-008_
  
  - [ ]* 11.2 Escrever property test para adição de produtos
    - **Property 21: Product Addition Increases Total**
    - **Validates: Requirements RF-008**
  
  - [ ]* 11.3 Escrever property test para remoção de produtos
    - **Property 22: Product Removal Decreases Total**
    - **Validates: Requirements RF-008**


- [ ] 12. Implementar testes de useComandaManagement
  - [ ] 12.1 Criar testes unitários para useComandaManagement
    - Testar listagem de comandas
    - Testar filtros (status, mesa, cliente)
    - Testar sincronização com Firebase
    - Testar loading states
    - Mockar Firebase queries
    - Usar renderHook e act()
    - _Requirements: RF-009_
  
  - [ ]* 12.2 Escrever property test para filtros
    - **Property 23: Comanda Filter Correctness**
    - **Validates: Requirements RF-009**

- [ ] 13. Checkpoint - Verificar cobertura de Hooks
  - Executar `npm run test:coverage`
  - Verificar que Hooks têm 70%+ de cobertura
  - Corrigir testes falhando se necessário
  - Perguntar ao usuário se há dúvidas

- [ ] 14. Implementar testes de componentes críticos
  - [ ] 14.1 Criar testes para OrderCard
    - Testar renderização de informações
    - Testar interação (onPress)
    - Testar badge de urgente
    - Testar diferentes status
    - Usar render e fireEvent
    - _Requirements: RF-013_
  
  - [ ] 14.2 Criar testes para ComandaDetails
    - Testar renderização de detalhes
    - Testar listagem de pedidos
    - Testar cálculo de totais
    - Testar interações (adicionar item, fechar)
    - _Requirements: RF-013_
  
  - [ ] 14.3 Criar testes para PizzaBuilderModal
    - Testar seleção de tamanho
    - Testar seleção de sabores
    - Testar validações
    - Testar cálculo de preço
    - Testar submissão
    - _Requirements: RF-013_


- [ ] 15. Checkpoint - Verificar cobertura de Components
  - Executar `npm run test:coverage`
  - Verificar que Components têm 60%+ de cobertura
  - Corrigir testes falhando se necessário
  - Perguntar ao usuário se há dúvidas

- [ ] 16. Implementar testes de integração
  - [ ] 16.1 Criar teste de fluxo completo de pedido
    - Criar pedido → Atualizar status → Entregar
    - Verificar transições de estado
    - Verificar timestamps
    - Verificar rastreabilidade (quem moveu)
    - _Requirements: RF-010_
  
  - [ ] 16.2 Criar teste de fluxo de pagamento
    - Criar comanda → Adicionar pedidos → Pagar → Fechar
    - Verificar cálculo de totais
    - Verificar saldo
    - Verificar validações
    - _Requirements: RF-011_
  
  - [ ] 16.3 Criar teste de fluxo de caixa
    - Abrir caixa → Registrar vendas → Fechar
    - Verificar cálculos
    - Verificar unicidade por data
    - Verificar fechamento
    - _Requirements: RF-012_

- [ ] 17. Checkpoint - Verificar cobertura global
  - Executar `npm run test:coverage`
  - Verificar que cobertura global é 70%+
  - Identificar áreas com baixa cobertura
  - Adicionar testes complementares se necessário
  - Perguntar ao usuário se há dúvidas


- [ ] 18. Configurar CI/CD
  - [ ] 18.1 Criar workflow do GitHub Actions
    - Criar arquivo .github/workflows/tests.yml
    - Configurar job de testes
    - Configurar upload de cobertura para Codecov
    - Configurar verificação de thresholds
    - Testar workflow em PR de teste
    - _Requirements: RNF-010, RNF-011, RNF-012_
  
  - [ ] 18.2 Configurar proteção de branch
    - Configurar branch protection rules no GitHub
    - Exigir que testes passem antes de merge
    - Exigir que branch esteja atualizada
    - Documentar processo no README
    - _Requirements: RNF-010, RNF-011_
  
  - [ ] 18.3 Configurar Codecov
    - Criar conta no Codecov
    - Adicionar badge de cobertura ao README
    - Configurar comentários automáticos em PRs
    - Verificar relatórios de cobertura
    - _Requirements: RNF-012_

- [ ] 19. Otimizar performance dos testes
  - [ ] 19.1 Verificar tempo de execução
    - Executar `npm test` e medir tempo total
    - Identificar testes lentos com --verbose
    - Verificar que suite completa executa em < 30s
    - _Requirements: RNF-001, RNF-002_
  
  - [ ] 19.2 Otimizar testes lentos se necessário
    - Melhorar mocks para reduzir overhead
    - Ajustar maxWorkers para paralelização
    - Remover sleeps e timeouts desnecessários
    - Usar jest.useFakeTimers() onde apropriado
    - _Requirements: RNF-001, RNF-002, RNF-003_


- [ ] 20. Documentação e finalização
  - [ ] 20.1 Atualizar README com instruções de teste
    - Adicionar seção sobre como executar testes
    - Documentar scripts NPM disponíveis
    - Adicionar badge de cobertura
    - Explicar estrutura de testes
    - _Requirements: RNF-007, RNF-009_
  
  - [ ] 20.2 Criar guia de contribuição para testes
    - Documentar padrões de teste
    - Explicar quando usar unit vs property tests
    - Fornecer exemplos de cada tipo de teste
    - Documentar processo de debug
    - _Requirements: RNF-007, RNF-008, RNF-009_
  
  - [ ] 20.3 Revisar e validar cobertura final
    - Executar `npm run test:coverage`
    - Gerar relatório HTML de cobertura
    - Verificar todas as metas de cobertura
    - Documentar áreas não cobertas (se houver)
    - _Requirements: RNF-004, RNF-005, RNF-006_

- [ ] 21. Checkpoint Final - Validação completa
  - Executar todos os testes: `npm test`
  - Verificar cobertura: `npm run test:coverage`
  - Testar CI/CD com PR real
  - Verificar que build falha se testes falharem
  - Confirmar que todas as metas foram atingidas
  - Perguntar ao usuário se há dúvidas ou ajustes necessários

---

## Notes

- Tasks marcadas com `*` são opcionais (property tests) e podem ser puladas para MVP mais rápido
- Cada task referencia os requisitos específicos que valida
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de correção
- Unit tests validam exemplos específicos e edge cases
- Ambos os tipos de teste são complementares e necessários para cobertura completa

---

## Estimativa de Tempo

- **Sprint 1** (Semana 1): Tasks 1-6 (Setup + Services)
- **Sprint 2** (Semana 2): Tasks 7-21 (Utils + Hooks + Components + Integration + CI/CD)

**Total**: 2 semanas com 1 desenvolvedor full-time

---

**Criado em:** 2026-01-31  
**Status:** Aguardando aprovação
