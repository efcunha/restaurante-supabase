# CONTEXT.md - Sistema de Comandas para Restaurante

**Última atualização:** 19/01/2026 13:05  
**Status:** ✅ Operacional + Sistema Completo de Cancelamento + Preços Dinâmicos

---

## 📋 VISÃO GERAL

Sistema de gerenciamento de comandas para restaurante especializado em **caldos**, **comidas** e **bebidas**. Desenvolvido em React Native com Expo e Firebase.

**Funcionalidades Principais:**
- ✅ **Cancelamento de comandas** com registro de motivo e responsável
- ✅ **3 abas de comandas:** Abertas, Pagas, Canceladas
- ✅ **Caldos com seleção de tamanho:** 300ml (R$ 15,00) e 180ml (R$ 10,00)
- ✅ **Temperos personalizáveis:** Cebolinha e Coentro, Cebolinha, Sem Nada
- ✅ **Cálculo dinâmico de preços** via Firestore (busca automática)
- ✅ **Display de forma de pagamento** nas comandas (PIX, Dinheiro, Débito, Crédito)
- ✅ **Layout otimizado de bebidas:** Nome → Valor → Quantidade (horizontal)
- ✅ **Nomes e preços em negrito** para melhor visibilidade

---

## 🏗️ ARQUITETURA

### Stack Tecnológica
- **Frontend:** React Native + Expo
- **Backend:** Firebase (Firestore + Authentication)
- **Navegação:** React Navigation (Bottom Tabs + Stack)
- **Estado:** Context API

### Estrutura de Pastas
```
restaurante-app/
├── screens/           # Telas do app
├── components/        # Componentes reutilizáveis
├── context/          # Context API (OrderContext)
├── src/
│   ├── auth/         # Sistema de autenticação e roles
│   ├── config/       # Configuração Firebase
│   └── utils/        # Utilitários e validações
└── scripts/          # Scripts de inicialização e testes
```

---

## 🍽️ MODELO DE NEGÓCIO

### Cardápio Atual

**🍲 Caldos (3 itens com 2 tamanhos cada)**
- Caldinho de Macaxeira 300ml - R$ 15,00 | 180ml - R$ 10,00
- Caldo de Fava 300ml - R$ 18,00 | 180ml - R$ 12,00
- Caldo de Camarão 300ml - R$ 25,00 | 180ml - R$ 17,00

**Temperos para Caldos:**
- Cebolinha e Coentro
- Cebolinha
- Sem Nada

**🍽️ Comidas (5 itens)**
- Risoto de Camarão - R$ 35,00
- Risoto de Charque - R$ 28,00
- Risoto de Frango - R$ 25,00
- Risoto de Queijo - R$ 22,00
- Batata Frita - R$ 15,00

**🥤 Bebidas (5 itens)**
- Refrigerante Lata - R$ 7,00
- Refrigerante 1L - R$ 10,00
- Água Mineral - R$ 4,00
- Água com Gás - R$ 4,00
- Suco - R$ 6,00

### Modelo de Preços
- **Preço único** por produto (sem variações)
- **Sem pontos de cocção** (sistema simplificado)
- Preços fixos no Firebase

---

## 👥 SISTEMA DE ROLES

| Role | Permissões | Telas Acessíveis |
|------|-----------|------------------|
| **admin** | Todas | Todas as telas |
| **gerente** | Gerenciar + Visualizar | Todas exceto configurações críticas |
| **garcom** | Criar pedidos + Visualizar | Novo Pedido, Comandas, Cozinha, Montagem, Prontos |
| **cozinheiro** | Visualizar cozinha | Cozinha |
| **montagem** | Montagem de pedidos | Montagem, Prontos |

---

## 🔄 FLUXO DE PEDIDOS

```
1. NOVO PEDIDO (Garçom)
   ↓
2. PENDENTE (Aguardando preparo)
   ↓
3. COZINHA (Cozinheiro prepara)
   ↓
4. MONTAGEM (Montador finaliza)
   ↓
5. PRONTO (Aguardando entrega)
   ↓
6. ENTREGUE (Pedido finalizado)
```

### Status de Pedidos
- `pendente` - Aguardando preparo
- `cozinha` - Em preparo na cozinha
- `montagem` - Em montagem final
- `pronto` - Pronto para entrega
- `entregue` - Entregue ao cliente

### Status de Comandas
- `aberta` - Comanda ativa com pedidos
- `fechada` - Comanda paga e finalizada
- `cancelada` - Comanda cancelada com registro

### Fluxo de Cancelamento
```
1. Usuário seleciona comanda aberta
   ↓
2. Clica em "CANCELAR COMANDA"
   ↓
3. Informa motivo do cancelamento
   ↓
4. Sistema registra:
   - Quem cancelou (nome e ID)
   - Horário do cancelamento
   - Motivo informado
   - Valor total da comanda
   ↓
5. Comanda move para aba "CANCELADAS"
```

---

## 📱 TELAS PRINCIPAIS

### 1. Login
- Autenticação via Firebase Auth
- Validação de roles
- Redirecionamento baseado em permissões

### 2. Novo Pedido
- Geração automática de número de comanda
- Seleção de produtos por categoria
- Controle de quantidade
- Observações opcionais
- Pagamento obrigatório antes de criar pedido

### 3. Cozinha
- Lista de caldos/comidas pendentes
- Agrupamento por tipo de produto
- Exibição de comandas e quantidades
- Marcar como pronto

### 4. Montagem
- Pedidos prontos da cozinha
- Finalização e montagem
- Envio para "Prontos"

### 5. Prontos
- Pedidos prontos para entrega
- Marcar como entregue

### 6. Comandas
- Gerenciamento de comandas abertas/pagas/canceladas
- 3 abas: ABERTAS, PAGAS, CANCELADAS
- Adicionar/remover itens
- Pagamento rápido (PIX, Dinheiro, Débito, Crédito)
- Cancelar comanda com motivo e registro de responsável
- Visualizar histórico de pagamentos
- Fechar comanda automaticamente após pagamento total

### 7. Admin
- Gerenciar cardápio
- Gerenciar funcionários
- Relatórios e estatísticas

---

## 🔥 ESTRUTURA FIREBASE

### Collections

**cardapio/items**
```javascript
{
  caldos: [
    { name: string, price: number, category: 'caldo', active: boolean }
  ],
  comidas: [
    { name: string, price: number, category: 'comida', active: boolean }
  ],
  bebidas: [
    { name: string, price: number, category: 'bebida', active: boolean }
  ]
}
```

**pedidos**
```javascript
{
  comanda: number,
  items: [{ name: string, quantity: number, price: number, category: string }],
  status: string,
  createdAt: timestamp,
  timeInCozinha: timestamp (opcional),
  total: number,
  clientName: string,
  observations: string,
  isPaid: boolean,
  paymentMethod: string,
  waiterName: string
}
```

**comandas**
```javascript
{
  numeroComanda: number,
  comandaNumber: string,
  cliente: string,
  dateKey: string, // YYYY-MM-DD
  status: string, // 'aberta', 'fechada', 'cancelada'
  totalConsumido: number,
  criadoPor: string,
  criadoPorNome: string,
  abertaAt: timestamp,
  
  // Campos para comandas canceladas
  canceladaPor: string,
  canceladaPorNome: string,
  canceladaEm: string, // ISO timestamp
  motivoCancelamento: string
}
```

**pagamentos**
```javascript
{
  comandaNumber: string,
  dateKey: string,
  forma: string, // 'pix', 'dinheiro', 'debito', 'credito'
  valor: number,
  usuarioNome: string,
  createdAt: timestamp
}
```

**funcionarios**
```javascript
{
  email: string,
  nome: string,
  funcao: string, // admin, gerente, garcom, cozinheiro, montagem
  ativo: boolean,
  criadoEm: string
}
```

---

## 🔐 CONFIGURAÇÃO

### Firebase
- **Projeto:** restaurante-6f221
- **Região:** us-central1
- **Autenticação:** Email/Password
- **Firestore:** Modo nativo

### Credenciais
- Arquivo: `serviceAccountKey.json` (não versionado)
- Variáveis de ambiente no `.env`

---

## 🚀 COMANDOS ÚTEIS

```bash
# Iniciar app
npm start

# Limpar dados do dia para testes
node limpar-hoje.js

# Ver todas as comandas e pedidos
node ver-tudo.js

# Ver comandas canceladas
node ver-canceladas.js

# Ver pagamentos detalhados
node ver-pagamentos-detalhado.js

# Testar cancelamento
node testar-cancelamento.js

# Adicionar caldos com tamanhos ao Firestore
node adicionar-caldos-tamanhos.js

# Inicializar Firebase limpo
node scripts/inicializar-firebase-limpo.js

# Executar testes
node scripts/testar-app.js

# Build APK Android assinado
./build-android.sh

# Instalar dependências
npm install --legacy-peer-deps
```

---

## 🔧 IMPLEMENTAÇÕES TÉCNICAS DETALHADAS

### 1. Cálculo Dinâmico de Preços (OrderContext.firestore.js)

**Função:** `calculateTotalFromFirestore(items)` (linhas 10-47)

```javascript
// Busca preços do Firestore em tempo real
// Reconhece tamanhos: "300ml" → R$ 15,00, "180ml" → R$ 10,00
// Remove temperos antes de buscar: "Caldinho (Cebolinha)" → "Caldinho"
// Formato de item: "2x Caldinho de Macaxeira 300ml (Cebolinha)"
```

**Integração:** Linha 200 - chamado antes de criar pedido

### 2. Seleção de Tamanho de Caldos (NovoPedidoScreen.js)

**Seção 300ml:** Linhas 320-441
**Seção 180ml:** Linhas 442-552

```javascript
// Cada tamanho tem 3 opções de tempero
// Formato salvo: "Caldinho de Macaxeira 300ml (Cebolinha e Coentro)"
// Botões coloridos: Laranja (#FF9800), Verde (#4CAF50), Cinza (#999)
```

### 3. Temperos para Risotos (NovoPedidoScreen.js)

**Seção:** Linhas 557-677

```javascript
// Mesmas 3 opções de tempero dos caldos
// Formato salvo: "Risoto de Camarão (Cebolinha)"
```

### 4. Layout de Bebidas (NovoPedidoScreen.js)

**Seção:** Linhas 680-710

```javascript
// Layout horizontal: Nome → Valor → Quantidade
// Botões: 36x36px, fonte 18
// Sem opções de tempero
```

### 5. Display de Pagamentos (ComandaGerenciamentoScreen.js)

**Estado:** Linha 103 - `pagamentosComanda`
**Carregamento:** Linhas 73-91 - `loadPagamentosComanda()`
**Integração:** Linhas 750-769 - chamado em `selecionarComanda()`
**UI:** Linhas 1262-1270
**Formato:** "💳 PIX - R$ 30.00" + "Recebido por: Administrador"

### 6. Sistema de Cancelamento (ComandaGerenciamentoScreen.js)

**Estado:** Linha 98 - `comandasCanceladas`
**Função:** Linhas 859-889 - `cancelarComanda()`
**Tratamento Status:** Linhas 473-479
**Filtro:** Linhas 697-709
**Aba UI:** Linhas 1786-1806
**Visualização:** Linhas 1930-1975
**Botão:** Linhas 1500-1510

**Dados Salvos no Firestore:**
```javascript
{
  status: 'cancelada',
  canceladaPor: user.id,
  canceladaPorNome: user.nome,
  canceladaEm: new Date().toISOString(),
  motivoCancelamento: 'texto informado'
}
```

---

## 📊 ESTRUTURA DE DADOS FIRESTORE

### cardapio/items
```javascript
{
  caldos: [
    { 
      name: "Caldinho de Macaxeira (300ml)", 
      price: 15.00, 
      category: "caldo", 
      active: true 
    },
    { 
      name: "Caldinho de Macaxeira (180ml)", 
      price: 10.00, 
      category: "caldo", 
      active: true 
    }
  ],
  comidas: [...],
  bebidas: [...]
}
```

### Formato de Itens em Pedidos
```javascript
// Caldos com tamanho e tempero
"Caldinho de Macaxeira 300ml (Cebolinha e Coentro)"
"Caldo de Camarão 180ml (Sem Nada)"

// Risotos com tempero
"Risoto de Camarão (Cebolinha)"
"Risoto de Charque (Sem Nada)"

// Bebidas (sem sufixo)
"Refrigerante Lata"
"Suco"
```

### Lógica de Cálculo de Preço
1. Parse item: `"2x Caldinho de Macaxeira 300ml (Cebolinha)"`
2. Extrai quantidade: `2`
3. Detecta tamanho: `300ml` → preço = 15.00
4. Se não tem tamanho, remove tempero: `item.replace(/\s*\(.*\)$/, '')`
5. Busca no Firestore cardapio
6. Calcula: `quantidade * preço`
7. Soma todos os itens

---

## 📊 MÉTRICAS DO PROJETO

- **Arquivos principais:** 17
- **Linhas de código:** ~3.500
- **Produtos no cardápio:** 13
- **Roles de usuário:** 5
- **Status de pedidos:** 5
- **Telas:** 10+

---

## 🔄 HISTÓRICO DE MUDANÇAS

### v2.0.1 (15/01/2026) - Build Automatizado
- ✅ Criado script build-android.sh para build automatizado
- ✅ Configurado assinatura automática de APKs
- ✅ APKs copiados para pasta build/ (fácil acesso)
- ✅ Aumentada memória do Gradle (4GB RAM + 1GB Metaspace)
- ✅ Gerados APKs para ARM64 e ARMv7
- ✅ Documentação de instalação (INSTALACAO_APK.md)

### v2.0 (15/01/2026) - Migração para Caldos
- ✅ Removido sistema de espetinhos
- ✅ Removido pontos de cocção
- ✅ Removido variações de preparo
- ✅ Adicionado caldos como produto principal
- ✅ Adicionado comidas (risotos + batata frita)
- ✅ Simplificado modelo de preços
- ✅ Renomeado Churrasqueira → Cozinha
- ✅ Atualizado roles: churrasqueiro → cozinheiro
- ✅ Redução de 40% na complexidade do código

---

## 📝 NOTAS IMPORTANTES

1. **Pagamento obrigatório:** Pedidos só são criados após confirmação de pagamento
2. **Comanda única:** Cada comanda pode ter múltiplos pedidos
3. **Firebase limpo:** Banco de dados foi reinicializado para novo modelo
4. **Sem migração de dados:** Dados antigos de espetinhos foram descartados
5. **Testes automatizados:** Script valida 6 funcionalidades críticas

---

## 🐛 TROUBLESHOOTING

### App não compila
```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

### Firebase vazio
```bash
node scripts/inicializar-firebase-limpo.js
```

### Erro de autenticação
- Verificar se usuário admin existe no Firebase Authentication
- Email: admin@restaurante.com

---

## 📊 MÉTRICAS DO PROJETO

- **Versão:** 2.1
- **Arquivos principais:** 20+
- **Linhas de código:** ~4.500
- **Produtos no cardápio:** 13 (3 caldos × 2 tamanhos + 5 comidas + 5 bebidas)
- **Opções de tempero:** 3 (Cebolinha e Coentro, Cebolinha, Sem Nada)
- **Roles de usuário:** 5 (admin, gerente, garcom, cozinheiro, montagem)
- **Status de pedidos:** 5 (pendente, cozinha, montagem, pronto, entregue)
- **Status de comandas:** 3 (aberta, fechada, cancelada)
- **Formas de pagamento:** 4 (PIX, Dinheiro, Débito, Crédito)
- **Telas:** 10+
- **Scripts utilitários:** 8

### Arquivos Críticos Modificados (Sessão Atual)
1. **OrderContext.firestore.js** - Cálculo dinâmico de preços (linhas 10-47, 200)
2. **NovoPedidoScreen.js** - Caldos com tamanhos, temperos, bebidas otimizadas
3. **ComandaGerenciamentoScreen.js** - Sistema de cancelamento completo
4. **PagamentosService.js** - Registro de forma de pagamento (linhas 158-160)

### Scripts Criados (Sessão Atual)
- `adicionar-caldos-tamanhos.js` - Popula caldos com 2 tamanhos
- `limpar-hoje.js` - Limpa dados do dia para testes
- `ver-canceladas.js` - Lista comandas canceladas
- `ver-pagamentos-detalhado.js` - Mostra pagamentos por comanda
- `testar-cancelamento.js` - Verifica comandas disponíveis para teste

---

## 📞 SUPORTE

Para dúvidas ou problemas:
1. Verificar logs do Expo: `npm start`
2. Executar testes: `node scripts/testar-app.js`
3. Ver dados: `node ver-tudo.js`
4. Limpar dados de teste: `node limpar-hoje.js`
5. Consultar documentação Firebase
6. Revisar este arquivo CONTEXT.md
7. Ver detalhes de cancelamento: CANCELAMENTO.md
