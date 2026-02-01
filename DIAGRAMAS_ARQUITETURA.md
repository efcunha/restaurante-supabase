# 📐 Diagramas de Arquitetura - Restaurante App

Este documento contém diagramas visuais da arquitetura do sistema usando Mermaid.

---

## 🏗️ Arquitetura Geral do Sistema

```mermaid
graph TB
    subgraph "Mobile App - React Native"
        A[Garçom Screen]
        B[Cozinha Screen]
        C[Montagem Screen]
        D[Admin Screen]
        E[Comandas Screen]
    end
    
    subgraph "Context Layer"
        F[AuthContext]
        G[OrderContext]
        H[ToastContext]
    end
    
    subgraph "Service Layer"
        I[OrderService]
        J[ComandasService]
        K[PagamentosService]
        L[CaixaService]
        M[PrinterService]
    end
    
    subgraph "Firebase Backend"
        N[(Firestore)]
        O[Firebase Auth]
        P[Cloud Functions]
    end
    
    A --> F
    A --> G
    B --> G
    C --> G
    D --> F
    E --> G
    
    F --> O
    G --> I
    G --> J
    I --> N
    J --> N
    K --> N
    L --> N
    M -.-> Q[Bluetooth Printer]
    
    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#e1f5ff
    style E fill:#e1f5ff
    style N fill:#fff4e1
    style O fill:#fff4e1
```

---

## 🔄 Fluxo de Criação de Pedido

```mermaid
sequenceDiagram
    participant G as Garçom
    participant UI as NovoPedidoScreen
    participant OC as OrderContext
    participant CS as ComandasService
    participant OS as OrderFirestoreService
    participant FS as Firestore
    participant K as Kitchen Screen
    
    G->>UI: Seleciona itens
    G->>UI: Informa cliente/mesa
    G->>UI: Clica "Criar Pedido"
    
    UI->>OC: addOrder(dados)
    OC->>CS: ensureComandaAberta()
    CS->>FS: Verifica/Cria comanda
    FS-->>CS: Comanda OK
    
    OC->>OS: saveOrder(pedido)
    OS->>FS: Salva pedido
    FS-->>OS: DocId
    
    OS->>CS: adicionarConsumo(valor)
    CS->>FS: Atualiza totalConsumido
    
    FS-->>K: Real-time listener
    K->>K: Exibe novo pedido
    
    FS-->>OC: Real-time listener
    OC-->>UI: Atualiza lista
    UI-->>G: Pedido criado!
```

---

## 💰 Fluxo de Pagamento

```mermaid
sequenceDiagram
    participant U as Usuário
    participant CD as ComandaDetails
    participant PS as PagamentosService
    participant FS as Firestore
    participant CS as CaixaService
    
    U->>CD: Seleciona forma pagamento
    U->>CD: Informa valor
    U->>CD: Confirma pagamento
    
    CD->>PS: registrarPagamento()
    
    par Transação Atômica
        PS->>FS: Atualiza comanda
        Note over FS: totalPago += valor
        Note over FS: saldoAberto = total - pago
        
        PS->>FS: Cria doc pagamento
        Note over FS: Collection: pagamentos
    end
    
    PS->>PS: marcarPedidosComoPagos()
    PS->>FS: Update pedidos.isPago = true
    
    PS->>CS: registrarVenda()
    CS->>FS: Atualiza caixa
    Note over FS: vendasTotal += valor
    Note over FS: porForma[tipo] += valor
    
    alt Saldo zerado
        PS->>FS: Fecha comanda
        Note over FS: status = 'fechada'
    end
    
    FS-->>CD: Atualização real-time
    CD-->>U: Pagamento registrado!
```

---

## 📦 Estrutura de Dados (Firestore)

```mermaid
erDiagram
    COMPANIES ||--o{ PEDIDOS : contains
    COMPANIES ||--o{ COMANDAS : contains
    COMPANIES ||--o{ PAGAMENTOS : contains
    COMPANIES ||--o{ CAIXAS : contains
    COMPANIES ||--o{ FUNCIONARIOS : contains
    COMPANIES ||--o{ CARDAPIO : contains
    
    PEDIDOS {
        string id PK
        string idFormatado
        string comandaNumber FK
        string dateKey
        string status
        array items
        number totalPrice
        boolean isPago
        timestamp createdAt
    }
    
    COMANDAS {
        string id PK
        string comandaNumber
        string dateKey
        string status
        string mesa
        string cliente
        number totalConsumido
        number totalPago
        number saldoAberto
        object pagamentosResumo
    }
    
    PAGAMENTOS {
        string id PK
        string comandaId FK
        string comandaNumber
        string dateKey
        number valor
        string forma
        string garcom
        timestamp createdAt
    }
    
    CAIXAS {
        string id PK
        string data
        string status
        number valorInicial
        number vendasTotal
        object porForma
        number saldoEsperado
        number saldoReal
    }
```

---

## 🔐 Sistema de Permissões

```mermaid
graph LR
    subgraph Roles
        A[Admin]
        B[Gerente]
        C[Garçom]
        D[Cozinheiro]
        E[Montagem]
    end
    
    subgraph Screens
        F[Novo Pedido]
        G[Comandas]
        H[Cozinha]
        I[Montagem]
        J[Prontos]
        K[Admin]
    end
    
    A --> F
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    
    B --> F
    B --> G
    B --> H
    B --> I
    B --> J
    B --> K
    
    C --> F
    C --> G
    
    D --> H
    
    E --> I
    E --> J
    
    style A fill:#ff6b6b
    style B fill:#ffa500
    style C fill:#4ecdc4
    style D fill:#95e1d3
    style E fill:#a8e6cf
```

---

## 🔄 Ciclo de Vida do Pedido

```mermaid
stateDiagram-v2
    [*] --> Criado: Garçom cria pedido
    
    Criado --> Montagem: Auto (status inicial)
    
    Montagem --> Pronto: Cozinha marca todos itens prontos
    
    Pronto --> Entregue: Garçom entrega ao cliente
    
    Entregue --> [*]
    
    note right of Criado
        - Pedido salvo no Firestore
        - Comanda criada/atualizada
        - Total adicionado
    end note
    
    note right of Montagem
        - Visível na Cozinha
        - Itens marcados individualmente
        - Controle por itemsWithStatus
    end note
    
    note right of Pronto
        - Visível em Prontos
        - Aguardando entrega
        - timeInProntos registrado
    end note
    
    note right of Entregue
        - deliveredAt registrado
        - Sai da lista ativa
        - Mantido para estatísticas
    end note
```

---

## 💳 Fluxo de Caixa Diário

```mermaid
stateDiagram-v2
    [*] --> Fechado: Início do dia
    
    Fechado --> Aberto: Admin abre caixa
    
    Aberto --> Aberto: Vendas registradas
    Aberto --> Aberto: Reforços
    Aberto --> Aberto: Sangrias
    
    Aberto --> Fechado: Admin fecha caixa
    
    Fechado --> [*]: Fim do dia
    
    note right of Aberto
        Operações:
        - Registrar vendas
        - Adicionar reforço
        - Fazer sangria
        - Consultar saldo
    end note
    
    note right of Fechado
        Ao fechar:
        - Informa saldo real
        - Calcula diferença
        - Limpa dados do dia
        - Gera relatório
    end note
```

---

## 🏪 Arquitetura Multi-Tenancy

```mermaid
graph TB
    subgraph "Firebase Project"
        A[(Firestore)]
    end
    
    subgraph "Company 1"
        B[pedidos]
        C[comandas]
        D[pagamentos]
        E[caixas]
    end
    
    subgraph "Company 2"
        F[pedidos]
        G[comandas]
        H[pagamentos]
        I[caixas]
    end
    
    subgraph "Company 3"
        J[pedidos]
        K[comandas]
        L[pagamentos]
        M[caixas]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    
    A --> F
    A --> G
    A --> H
    A --> I
    
    A --> J
    A --> K
    A --> L
    A --> M
    
    style A fill:#fff4e1
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#e1f5ff
    style E fill:#e1f5ff
    style F fill:#ffe1e1
    style G fill:#ffe1e1
    style H fill:#ffe1e1
    style I fill:#ffe1e1
    style J fill:#e1ffe1
    style K fill:#e1ffe1
    style L fill:#e1ffe1
    style M fill:#e1ffe1
```

---

## 📊 Fluxo de Sincronização Real-Time

```mermaid
sequenceDiagram
    participant FS as Firestore
    participant L as Listener (OrderContext)
    participant M as Merge Logic
    participant UI as UI Components
    
    loop Real-time Updates
        FS->>L: onSnapshot(pedidos)
        L->>L: Recebe novos dados
        
        L->>M: Merge com estado local
        
        alt Dados do Firestore mais recentes
            M->>M: Usa dados do Firestore
        else Dados locais mais recentes
            M->>M: Mantém dados locais
        end
        
        M->>L: Estado atualizado
        L->>UI: Re-render
        UI->>UI: Exibe dados atualizados
    end
    
    Note over FS,UI: Sincronização < 1 segundo
```

---

## 🔧 Arquitetura de Services

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[Screens]
        B[Components]
    end
    
    subgraph "Business Logic Layer"
        C[OrderService]
        D[ComandasService]
        E[PagamentosService]
        F[CaixaService]
        G[PrinterService]
    end
    
    subgraph "Data Layer"
        H[OrderFirestoreService]
        I[Firestore Utils]
    end
    
    subgraph "External Services"
        J[(Firestore)]
        K[Bluetooth Printer]
    end
    
    A --> C
    A --> D
    B --> C
    
    C --> H
    D --> H
    E --> H
    F --> H
    
    H --> I
    I --> J
    
    G --> K
    
    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#fff4e1
    style E fill:#fff4e1
    style F fill:#fff4e1
    style G fill:#fff4e1
    style H fill:#ffe1e1
    style I fill:#ffe1e1
    style J fill:#e1ffe1
    style K fill:#e1ffe1
```

---

## 📱 Navegação do App

```mermaid
graph TB
    A[App.js] --> B{Usuário Logado?}
    
    B -->|Não| C[AuthStack]
    C --> D[LoginScreen]
    C --> E[RegisterScreen]
    
    B -->|Sim| F[TabNavigator]
    
    F --> G[Novo Pedido]
    F --> H[Comandas]
    F --> I[Cozinha]
    F --> J[Montagem]
    F --> K[Prontos]
    F --> L[Admin]
    
    G --> M[useNovoPedido Hook]
    H --> N[useComandaManagement Hook]
    
    L --> O[Caixa]
    L --> P[Relatórios]
    L --> Q[Configurações]
    
    style A fill:#ff6b6b
    style F fill:#4ecdc4
    style G fill:#95e1d3
    style H fill:#95e1d3
    style I fill:#95e1d3
    style J fill:#95e1d3
    style K fill:#95e1d3
    style L fill:#95e1d3
```

---

## 🎯 Conclusão

Estes diagramas fornecem uma visão visual clara da arquitetura do Restaurante App, facilitando o entendimento de:

- Estrutura geral do sistema
- Fluxos de dados
- Relacionamentos entre entidades
- Ciclos de vida
- Permissões e acessos

Para mais detalhes, consulte:
- [ANALISE_PROJETO.md](./ANALISE_PROJETO.md)
- [ANALISE_TECNICA_DETALHADA.md](./ANALISE_TECNICA_DETALHADA.md)

---

**Diagramas elaborados por:** Kiro AI  
**Data:** 31/01/2026
