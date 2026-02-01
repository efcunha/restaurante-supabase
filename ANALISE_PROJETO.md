# 📊 Análise Completa do Projeto - Restaurante App

**Data da Análise:** 31 de Janeiro de 2026  
**Versão do App:** 1.0.0  
**Plataforma:** React Native (Expo) + Firebase

---

## 🎯 Visão Geral do Projeto

O **Restaurante App** é uma solução mobile completa para gestão de restaurantes, focada em ambientes de alta demanda como churrascarias e restaurantes com sistema de comandas. O aplicativo gerencia todo o fluxo operacional desde a criação de pedidos até o fechamento financeiro do caixa.

### Propósito Principal
- Digitalizar e otimizar o fluxo de pedidos em restaurantes
- Gerenciar comandas (contas) de clientes
- Controlar o fluxo de produção (Cozinha → Montagem → Entrega)
- Gerenciar caixa e pagamentos
- Fornecer relatórios e estatísticas de vendas

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico

#### Frontend
- **Framework:** React Native 0.81.5
- **Runtime:** Expo ~54.0
- **Navegação:** React Navigation 6.x (Stack + Bottom Tabs)
- **Gerenciamento de Estado:** React Context API
- **UI:** StyleSheet nativo + componentes customizados
- **Linguagem:** JavaScript + TypeScript (parcial)

#### Backend
- **BaaS:** Firebase (Firestore + Auth)
- **Banco de Dados:** Firestore (NoSQL)
- **Autenticação:** Firebase Auth
- **Armazenamento Local:** AsyncStorage
- **Cache:** Persistência offline do Firestore

#### Integrações
- **Impressão:** Bluetooth ESC/POS (react-native-esc-pos-printer)
- **Gráficos:** react-native-chart-kit + react-native-svg
- **Haptics:** expo-haptics (feedback tátil)

### Padrões Arquiteturais

#### 1. **Separação em Camadas**
```
src/
├── screens/        # Camada de Apresentação (UI)
├── components/     # Componentes Reutilizáveis
├── context/        # Gerenciamento de Estado Global
├── services/       # Lógica de Negócio + Integração Firebase
├── hooks/          # Custom Hooks (lógica reutilizável)
├── utils/          # Funções Auxiliares
├── config/         # Configurações (Firebase, etc)
└── auth/           # Sistema de Roles e Permissões
```

#### 2. **Context API para Estado Global**
- **AuthContext:** Autenticação, usuário logado, permissões
- **OrderContext:** Sincronização em tempo real de pedidos
- **ToastContext:** Notificações globais

#### 3. **Service Layer Pattern**
Toda lógica de negócio está encapsulada em serviços:
- `OrderFirestoreService`: CRUD de pedidos
- `ComandasService`: Gestão de comandas
- `PagamentosService`: Processamento de pagamentos
- `CaixaService`: Operações de caixa
- `PrinterService`: Impressão Bluetooth

---

## 📂 Estrutura de Dados (Firestore)

### Modelo Multi-Tenancy
```
companies/{companyId}/
├── pedidos/           # Pedidos do restaurante
├── comandas/          # Comandas (contas) abertas/fechadas
├── pagamentos/        # Transações financeiras
├── caixas/            # Sessões de caixa
├── cardapio/          # Menu do restaurante
└── funcionarios/      # Funcionários da empresa
```

### Principais Collections

#### 1. **Pedidos** (`pedidos`)
```javascript
{
  id: "AutoID",
  idFormatado: "#001",
  comandaNumber: "10",
  mesa: "5",
  cliente: "João Silva",
  dateKey: "2026-01-31",  // Partição por data
  status: "montagem",      // churrasqueira | montagem | pronto | delivered
  itens: ["1x Picanha", "2x Coca-Cola"],
  itemsWithStatus: [       // Controle individual de itens
    {
      id: "#001-item-0",
      name: "Picanha",
      status: "pronto",
      checked: true,
      timestamp: "ISO"
    }
  ],
  totalPrice: 150.00,
  isPago: false,
  createdAt: "ISO Timestamp",
  createdBy: "userId",
  createdByName: "Garçom Nome",
  timeInMontagem: "ISO",
  timeInProntos: "ISO",
  deliveredAt: "ISO"
}
```

#### 2. **Comandas** (`comandas`)
```javascript
{
  id: "comanda-2026-01-31-10",
  comandaNumber: "10",
  dateKey: "2026-01-31",
  status: "aberta",        // aberta | fechada | cancelada
  mesa: "5",
  cliente: "João Silva",
  totalConsumido: 150.00,
  totalPago: 50.00,
  saldoAberto: 100.00,
  pagamentosResumo: {
    dinheiro: 50.00,
    pix: 0,
    debito: 0,
    credito: 0
  },
  abertaAt: "Timestamp",
  abertaPor: "userId",
  fechadaAt: null
}
```

#### 3. **Pagamentos** (`pagamentos`)
```javascript
{
  id: "AutoID",
  comandaId: "comanda-2026-01-31-10",
  comandaNumber: "10",
  dateKey: "2026-01-31",
  valor: 50.00,
  forma: "dinheiro",       // dinheiro | pix | debito | credito
  usuarioId: "userId",
  usuarioNome: "Caixa Nome",
  garcom: "garcomId",      // Garçom atribuído à mesa
  createdAt: "Timestamp"
}
```

#### 4. **Caixas** (`caixas`)
```javascript
{
  id: "caixa-2026-01-31",
  data: "2026-01-31",
  status: "aberto",        // aberto | fechado
  valorInicial: 100.00,
  vendasTotal: 1500.00,
  porForma: {
    dinheiro: 800.00,
    pix: 400.00,
    debito: 200.00,
    credito: 100.00
  },
  reforcosTotal: 0,
  sangriasTotal: 0,
  saldoEsperado: 1600.00,
  saldoReal: 1595.00,      // Contado no fechamento
  diferenca: -5.00,
  abertoPor: "userId",
  fechadoPor: "userId",
  abertoAt: "Timestamp",
  fechadoAt: "Timestamp"
}
```

### Índices Compostos (Performance)
```json
{
  "pedidos": [
    ["dateKey ASC", "numeroComanda ASC"],
    ["dateKey ASC", "status ASC", "createdAt DESC"]
  ],
  "comandas": [
    ["dateKey ASC", "status ASC", "comandaNumber ASC"]
  ],
  "pagamentos": [
    ["dateKey ASC", "comandaNumber ASC", "createdAt DESC"]
  ]
}
```

---

## 🔄 Fluxos Principais

### 1. Fluxo de Criação de Pedido
```
1. Garçom abre "Novo Pedido"
2. Seleciona itens do cardápio
3. Informa cliente e mesa (opcional)
4. Sistema calcula total automaticamente
5. Ao confirmar:
   a. Verifica se caixa está aberto
   b. Cria/atualiza comanda automaticamente
   c. Salva pedido no Firestore
   d. Adiciona valor ao totalConsumido da comanda
6. Pedido aparece em tempo real na Cozinha
```

### 2. Fluxo de Produção (Kitchen Display System)
```
Cozinha Screen:
- Visualiza pedidos em "montagem"
- Marca itens individuais como prontos
- Quando todos itens prontos → move para "Prontos"

Montagem Screen:
- Visualiza pedidos em "montagem"
- Finaliza montagem de pratos
- Move para "Prontos"

Prontos Screen (Entrega):
- Visualiza pedidos prontos
- Marca como entregue ao cliente
- Pedido sai da lista ativa
```

### 3. Fluxo de Pagamento
```
1. Cliente solicita conta
2. Garçom/Caixa acessa "Comandas"
3. Seleciona comanda do cliente
4. Visualiza todos pedidos e total
5. Registra pagamento:
   a. Escolhe forma (dinheiro/pix/débito/crédito)
   b. Informa valor
   c. Sistema valida e registra
   d. Atualiza totalPago da comanda
   e. Marca pedidos como pagos
   f. Registra venda no caixa
6. Se totalPago >= totalConsumido:
   - Comanda é fechada automaticamente
```

### 4. Fluxo de Caixa
```
Abertura:
1. Admin/Gerente abre caixa
2. Informa valor inicial (troco)
3. Sistema cria registro do dia
4. Reseta contador de comandas

Durante o Dia:
- Vendas são registradas automaticamente
- Possível fazer reforços (adicionar dinheiro)
- Possível fazer sangrias (retirar dinheiro)

Fechamento:
1. Admin/Gerente fecha caixa
2. Informa saldo real contado
3. Sistema calcula diferença
4. Limpa dados do dia:
   - Remove comandas abertas (abandonadas)
   - Remove pedidos não pagos
   - Preserva comandas fechadas (histórico)
```

---

## 👥 Sistema de Roles e Permissões

### Roles Disponíveis
```javascript
{
  ADMIN: 'admin',
  GERENTE: 'gerente',
  GARCOM: 'garcom',
  COZINHEIRO: 'cozinheiro',
  MONTAGEM: 'montagem'
}
```

### Matriz de Permissões

| Tela/Ação | Admin | Gerente | Garçom | Cozinheiro | Montagem |
|-----------|-------|---------|--------|------------|----------|
| Novo Pedido | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comandas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cozinha | ✅ | ✅ | ❌ | ✅ | ❌ |
| Montagem | ✅ | ✅ | ❌ | ❌ | ✅ |
| Prontos | ✅ | ✅ | ❌ | ❌ | ✅ |
| Admin | ✅ | ✅ | ❌ | ❌ | ❌ |

### Permissões Específicas
- **CREATE_ORDER:** Criar pedidos
- **UPDATE_STATUS:** Atualizar status de pedidos
- **MANAGE_USERS:** Gerenciar funcionários
- **VIEW_REPORTS:** Visualizar relatórios
- **CONFIGURE_PRODUCTS:** Configurar cardápio
- **SECURITY_SETTINGS:** Configurações de segurança

---

## 🔐 Segurança e Validações

### Autenticação
- Firebase Auth com email/senha
- Persistência desabilitada (login manual obrigatório)
- Logout automático ao fechar app
- Validação de funcionário no Firestore após login

### Validações de Negócio

#### Pedidos
- ✅ Caixa deve estar aberto
- ✅ Comanda não pode ter pagamentos registrados ao adicionar itens
- ✅ Total calculado no servidor (segurança)
- ✅ Campo `isPago` só pode ser alterado por `PagamentosService`

#### Pagamentos
- ✅ Valor deve ser > 0
- ✅ Forma de pagamento deve ser válida
- ✅ Comanda deve existir
- ✅ Transação atômica (Firestore Transaction)

#### Caixa
- ✅ Apenas um caixa aberto por dia
- ✅ Sangria não pode exceder saldo
- ✅ Fechamento requer contagem física
- ✅ Limpeza automática ao fechar

### Firestore Security Rules
```javascript
// Exemplo de regra
match /companies/{companyId}/pedidos/{pedidoId} {
  allow read, write: if request.auth != null 
    && request.auth.token.companyId == companyId;
}
```

---

## ⚡ Otimizações e Performance

### 1. **Cache e Offline-First**
- Firestore com cache persistente
- Queries com cache de 30 segundos (estatísticas)
- AsyncStorage para dados locais
- Sincronização automática ao reconectar

### 2. **Queries Otimizadas**
- Filtros server-side por `dateKey`
- Índices compostos para queries complexas
- Limit em queries de histórico
- Debounce em listeners (100ms)

### 3. **Renderização**
- `React.memo` em componentes pesados
- `useCallback` para funções
- `useMemo` para cálculos
- `SectionList` com virtualização
- `removeClippedSubviews` no Android

### 4. **Animações**
- `LayoutAnimation` para transições suaves
- Feedback háptico em ações importantes
- Loading states em operações assíncronas

---

## 📱 Funcionalidades Especiais

### 1. **Pizza Builder**
- Modal interativo para montar pizzas
- Suporte a múltiplos tamanhos
- Cálculo dinâmico de preço
- Ingredientes customizáveis

### 2. **Impressão Bluetooth**
- Conexão automática com impressora
- Formato ESC/POS
- Impressão de comandas
- Configuração persistente

### 3. **Estatísticas em Tempo Real**
- Vendas por garçom
- Vendas por forma de pagamento
- Ticket médio
- Produto mais vendido
- Comandas abertas/fechadas

### 4. **Gestão de Cardápio**
- Categorias dinâmicas
- Variações de produtos (tamanhos, temperos)
- Ativação/desativação de itens
- Preços por variação

### 5. **Controle de Estoque** (Parcial)
- Cadastro de fornecedores
- Registro de entrada/saída
- Alertas de estoque baixo

---

## 🐛 Pontos de Atenção e Limitações

### Limitações Conhecidas

1. **Sincronização de Data**
   - Usa data local do dispositivo
   - Pode causar inconsistências se dispositivos em fusos diferentes
   - **Solução:** Padronizar timezone (America/Sao_Paulo)

2. **Conflitos de Merge**
   - Atualizações simultâneas podem causar race conditions
   - **Mitigação:** Timestamps de atualização + merge inteligente

3. **Limpeza de Dados**
   - Limpeza ao fechar caixa é irreversível
   - Comandas abertas são deletadas
   - **Cuidado:** Garantir que não há comandas ativas antes de fechar

4. **Impressão Bluetooth**
   - Depende de hardware específico
   - Conexão pode ser instável
   - **Fallback:** Compartilhamento de PDF

5. **Offline Mode**
   - Funcionalidades limitadas offline
   - Criação de pedidos requer conexão
   - **Melhoria:** Implementar fila offline completa

### Bugs Conhecidos

1. **Pizza com vírgula no preço**
   - Preços com vírgula (ex: "15,00") não são parseados corretamente
   - **Fix aplicado:** Conversão de vírgula para ponto

2. **ItemId não encontrado após restart**
   - Mapeamento orderId → firestoreDocId perdido
   - **Fix aplicado:** Busca por itemId no Firestore

3. **Comanda reabre após pagamento parcial**
   - Se adicionar novo pedido, comanda fechada reabre
   - **Comportamento:** Intencional para flexibilidade

---

## 🔧 Configuração e Deploy

### Variáveis de Ambiente
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Scripts Disponíveis
```json
{
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "lint": "eslint .",
  "deploy:indexes": "firebase deploy --only firestore:indexes"
}
```

### Build Android
```bash
./build-android.sh
# ou
eas build -p android --profile production
```

### Deploy Firestore
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 📊 Métricas e KPIs

### Métricas Rastreadas
- Total de pedidos por período
- Valor total vendido
- Vendas por forma de pagamento
- Vendas por garçom
- Ticket médio
- Comandas abertas vs fechadas
- Tempo médio de produção
- Produtos mais vendidos

### Relatórios Disponíveis
- Dashboard financeiro
- Estatísticas por garçom
- Histórico de caixa
- Fluxo de caixa
- Relatório de vendas

---

## 🚀 Roadmap e Melhorias Futuras

### Curto Prazo
- [ ] Melhorar modo offline
- [ ] Adicionar testes automatizados
- [ ] Implementar backup automático
- [ ] Melhorar UX de impressão
- [ ] Adicionar notificações push

### Médio Prazo
- [ ] Integração com delivery
- [ ] App para cliente (self-service)
- [ ] Relatórios avançados (BI)
- [ ] Integração com ERP
- [ ] Multi-idioma

### Longo Prazo
- [ ] Versão web (admin)
- [ ] IA para previsão de demanda
- [ ] Integração com pagamento online
- [ ] Sistema de fidelidade
- [ ] Marketplace de fornecedores

---

## 📚 Documentação Adicional

### Arquivos de Documentação
- `docs/ARCHITECTURE.md` - Arquitetura detalhada
- `docs/DATABASE.md` - Schema do banco
- `docs/WORKFLOWS.md` - Workflows operacionais

### Código Importante
- `src/context/OrderContext.firestore.js` - Lógica central de pedidos
- `src/services/OrderFirestoreService.js` - Integração Firestore
- `src/services/ComandasService.js` - Gestão de comandas
- `src/services/PagamentosService.js` - Processamento de pagamentos
- `src/services/CaixaService.js` - Operações de caixa

---

## 🎓 Conclusão

O **Restaurante App** é uma solução robusta e bem arquitetada para gestão de restaurantes. Principais destaques:

### Pontos Fortes
✅ Arquitetura limpa e bem organizada  
✅ Sincronização em tempo real  
✅ Sistema de permissões robusto  
✅ Otimizações de performance  
✅ Suporte offline  
✅ Documentação completa  

### Áreas de Melhoria
⚠️ Cobertura de testes  
⚠️ Tratamento de erros  
⚠️ Modo offline completo  
⚠️ Monitoramento e logs  
⚠️ Internacionalização  

### Recomendações
1. Implementar testes unitários e E2E
2. Adicionar Sentry ou similar para monitoramento
3. Melhorar documentação inline (JSDoc)
4. Criar guia de contribuição
5. Implementar CI/CD

---

**Análise realizada por:** Kiro AI  
**Última atualização:** 31/01/2026
