# Requirements: Implementação de Testes Automatizados

**Feature:** Sistema de Testes Automatizados  
**Priority:** 🔴 Crítica  
**Status:** Not Started  
**Created:** 2026-01-31

---

## 1. Visão Geral

### 1.1 Problema
O projeto atualmente não possui testes automatizados (0% de cobertura), o que representa um risco significativo para:
- Regressões em funcionalidades existentes
- Confiança em deploys
- Manutenibilidade do código
- Qualidade geral do produto

### 1.2 Solução Proposta
Implementar uma suite completa de testes automatizados usando Jest e React Native Testing Library, com cobertura mínima de 70% do código.

### 1.3 Objetivos
- Garantir qualidade do código
- Prevenir regressões
- Facilitar refatorações
- Aumentar confiança em deploys
- Documentar comportamento esperado

---

## 2. User Stories

### 2.1 Como Desenvolvedor
**Quero** executar testes automatizados antes de cada commit  
**Para** garantir que minhas mudanças não quebram funcionalidades existentes  
**Critério de Aceitação:**
- Testes executam em < 30 segundos
- Feedback claro sobre falhas
- Cobertura de código visível

### 2.2 Como Tech Lead
**Quero** ter cobertura mínima de 70% do código  
**Para** garantir qualidade e confiabilidade do sistema  
**Critério de Aceitação:**
- Cobertura de Services: 80%+
- Cobertura de Utils: 90%+
- Cobertura de Hooks: 70%+
- Cobertura de Components: 60%+

### 2.3 Como DevOps
**Quero** que testes rodem automaticamente no CI/CD  
**Para** bloquear merges de código com falhas  
**Critério de Aceitação:**
- Testes rodam em cada PR
- Build falha se testes falharem
- Relatório de cobertura gerado

---

## 3. Requisitos Funcionais

### 3.1 Testes Unitários

#### 3.1.1 Services
- **RF-001:** Testar OrderService
  - Criação de pedidos
  - Cálculo de totais
  - Validações de dados
  - Formatação de IDs

- **RF-002:** Testar ComandasService
  - Criação de comandas
  - Adição de consumo
  - Fechamento de comandas
  - Sincronização de totais

- **RF-003:** Testar PagamentosService
  - Registro de pagamentos
  - Validações de valor
  - Validações de forma de pagamento
  - Marcação de pedidos como pagos

- **RF-004:** Testar CaixaService
  - Abertura de caixa
  - Registro de vendas
  - Reforços e sangrias
  - Fechamento de caixa

#### 3.1.2 Utils
- **RF-005:** Testar dateUtils
  - Formatação de datas
  - Cálculo de ranges
  - Conversão de timezones

- **RF-006:** Testar validation
  - Validação de emails
  - Validação de valores
  - Validação de formas de pagamento

- **RF-007:** Testar orderCalculator
  - Cálculo de totais
  - Parsing de quantidades
  - Matching de preços

#### 3.1.3 Hooks
- **RF-008:** Testar useNovoPedido
  - Gerenciamento de produtos
  - Cálculo de total
  - Submissão de pedido

- **RF-009:** Testar useComandaManagement
  - Listagem de comandas
  - Filtros
  - Sincronização

### 3.2 Testes de Integração

- **RF-010:** Testar fluxo completo de pedido
  - Criar pedido → Atualizar status → Entregar

- **RF-011:** Testar fluxo de pagamento
  - Criar comanda → Adicionar pedidos → Pagar → Fechar

- **RF-012:** Testar fluxo de caixa
  - Abrir → Registrar vendas → Fechar

### 3.3 Testes de Componentes

- **RF-013:** Testar componentes críticos
  - OrderCard
  - ComandaDetails
  - PizzaBuilderModal

---

## 4. Requisitos Não-Funcionais

### 4.1 Performance
- **RNF-001:** Testes unitários devem executar em < 10s
- **RNF-002:** Suite completa deve executar em < 30s
- **RNF-003:** Testes devem rodar em paralelo

### 4.2 Cobertura
- **RNF-004:** Cobertura mínima de 70% do código
- **RNF-005:** Services devem ter 80%+ de cobertura
- **RNF-006:** Utils devem ter 90%+ de cobertura

### 4.3 Manutenibilidade
- **RNF-007:** Testes devem ser fáceis de entender
- **RNF-008:** Testes devem ser independentes
- **RNF-009:** Testes devem ter nomes descritivos

### 4.4 CI/CD
- **RNF-010:** Testes devem rodar em cada PR
- **RNF-011:** Build deve falhar se testes falharem
- **RNF-012:** Relatório de cobertura deve ser gerado

---

## 5. Restrições

### 5.1 Técnicas
- Usar Jest como test runner
- Usar React Native Testing Library para componentes
- Não mockar Firebase em testes unitários de services (usar emulator)
- Manter testes rápidos (< 30s total)

### 5.2 Tempo
- Implementação: 2 semanas
- Sprint 1: Setup + Services
- Sprint 2: Utils + Hooks + Components

### 5.3 Recursos
- 1 desenvolvedor full-time
- Acesso ao Firebase Emulator

---

## 6. Dependências

### 6.1 Externas
- Jest
- @testing-library/react-native
- @testing-library/jest-native
- Firebase Emulator Suite

### 6.2 Internas
- Código existente deve ser testável
- Pode requerer pequenas refatorações

---

## 7. Critérios de Aceitação

### 7.1 Gerais
- [ ] Suite de testes configurada e funcionando
- [ ] Cobertura mínima de 70% alcançada
- [ ] Testes rodam em < 30 segundos
- [ ] CI/CD configurado com testes

### 7.2 Services
- [ ] OrderService: 80%+ cobertura
- [ ] ComandasService: 80%+ cobertura
- [ ] PagamentosService: 80%+ cobertura
- [ ] CaixaService: 80%+ cobertura

### 7.3 Utils
- [ ] dateUtils: 90%+ cobertura
- [ ] validation: 90%+ cobertura
- [ ] orderCalculator: 90%+ cobertura

### 7.4 Hooks
- [ ] useNovoPedido: 70%+ cobertura
- [ ] useComandaManagement: 70%+ cobertura

### 7.5 Integração
- [ ] Fluxo de pedido testado
- [ ] Fluxo de pagamento testado
- [ ] Fluxo de caixa testado

---

## 8. Métricas de Sucesso

### 8.1 Cobertura
- Cobertura total: 70%+
- Cobertura de Services: 80%+
- Cobertura de Utils: 90%+

### 8.2 Performance
- Tempo de execução: < 30s
- Testes unitários: < 10s
- Testes de integração: < 20s

### 8.3 Qualidade
- 0 testes flaky
- 100% dos testes passando
- 0 warnings no console

---

## 9. Riscos e Mitigações

### 9.1 Riscos
- **Risco:** Testes lentos
  - **Mitigação:** Usar mocks apropriados, rodar em paralelo

- **Risco:** Testes flaky
  - **Mitigação:** Evitar timeouts, usar waitFor corretamente

- **Risco:** Baixa cobertura
  - **Mitigação:** Focar em código crítico primeiro

### 9.2 Suposições
- Firebase Emulator está disponível
- Código existente é testável
- Equipe tem conhecimento de Jest

---

## 10. Fora do Escopo

- ❌ Testes E2E (Detox)
- ❌ Testes de performance
- ❌ Testes de segurança
- ❌ Testes visuais (snapshot)
- ❌ Refatoração completa do código

---

## 11. Referências

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)
- [CHECKLIST_QUALIDADE.md](../../../CHECKLIST_QUALIDADE.md)

---

**Aprovado por:** [Aguardando aprovação]  
**Data de Aprovação:** [Aguardando]
