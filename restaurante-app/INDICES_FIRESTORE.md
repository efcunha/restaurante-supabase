# Índices do Firestore - Restaurante App

## 🎯 Resumo
Este documento lista todos os índices compostos necessários para o funcionamento otimizado do app.

## 📋 Índices Obrigatórios

### 1️⃣ Coleção: `orders`

#### Índice 1: Buscar pedidos por data
- **Campos:**
  - `dateKey` (Ascending)
  - `createdAt` (Descending)
- **Uso:** Listar pedidos do dia ordenados por horário

#### Índice 2: Unicidade de comanda por dia
- **Campos:**
  - `dateKey` (Ascending)
  - `comandaNumber` (Ascending)
- **Uso:** Garantir que cada número de comanda seja único no dia

#### Índice 3: Buscar por status
- **Campos:**
  - `dateKey` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Descending)
- **Uso:** Filtrar pedidos por status (churrasqueira, montagem, pronto)

---

### 2️⃣ Coleção: `cardapio`

#### Índice 1: Buscar por categoria
- **Campos:**
  - `category` (Ascending)
  - `active` (Ascending)
- **Uso:** Listar caldos, comidas ou bebidas ativas

#### Índice 2: Buscar ativos ordenados
- **Campos:**
  - `active` (Ascending)
  - `name` (Ascending)
- **Uso:** Listar todos os itens ativos em ordem alfabética

---

### 3️⃣ Coleção: `temperos`

#### Índice 1: Ordenar temperos
- **Campos:**
  - `active` (Ascending)
  - `order` (Ascending)
- **Uso:** Listar temperos ativos na ordem correta

---

### 4️⃣ Coleção: `comandas`

#### Índice 1: Unicidade de comanda
- **Campos:**
  - `dateKey` (Ascending)
  - `comandaNumber` (Ascending)
- **Uso:** Garantir que cada comanda seja única no dia

#### Índice 2: Buscar comandas abertas
- **Campos:**
  - `dateKey` (Ascending)
  - `status` (Ascending)
- **Uso:** Listar comandas abertas do dia

---

### 5️⃣ Coleção: `pagamentos`

#### Índice 1: Buscar pagamentos por comanda
- **Campos:**
  - `dateKey` (Ascending)
  - `comandaNumber` (Ascending)
  - `createdAt` (Descending)
- **Uso:** Listar pagamentos de uma comanda

---

## 🔧 Como Criar os Índices

### Opção 1: Via Console (Recomendado)
1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto: **restaurante-dabf3**
3. Vá em **Firestore Database** > **Indexes**
4. Clique em **Create Index**
5. Selecione a coleção
6. Adicione os campos conforme listado acima
7. Clique em **Create**
8. Aguarde a criação (pode levar alguns minutos)

### Opção 2: Via Link de Erro
Quando você executar uma query que precisa de índice, o Firebase mostrará um link direto no console. Basta clicar e confirmar a criação.

---

## 🔒 Validação de Unicidade

### Comandas
A unicidade de comandas por dia é garantida por:
1. **ID do documento:** `comanda-{dateKey}-{numero}`
2. **Índice composto:** `dateKey + comandaNumber`
3. **Validação no código:** `ComandasService.ensureComandaAberta()`

### Funcionários
A unicidade de funcionários é garantida por:
1. **ID do documento:** `{uid}` (Firebase Auth UID)
2. **Security Rules:** Impede criação de documentos duplicados

---

## 📊 Status Atual

Execute o script para verificar:
```bash
node criar-indices.js
```

Isso mostrará:
- ✅ Índices necessários
- ⚠️ Duplicatas encontradas (se houver)
- 📊 Estatísticas das coleções

---

## 🚨 Troubleshooting

### Erro: "The query requires an index"
1. Copie o link do erro
2. Cole no navegador
3. Confirme a criação do índice
4. Aguarde alguns minutos
5. Tente novamente

### Comandas duplicadas
Execute:
```bash
node criar-indices.js
```
O script mostrará quais comandas estão duplicadas e seus IDs.

---

## 📝 Notas Importantes

1. **dateKey sempre usa data local** (America/Sao_Paulo)
2. **comandaNumber é sempre string** para evitar problemas de tipo
3. **Índices levam alguns minutos** para serem criados
4. **Não delete índices** sem verificar se estão em uso
5. **Cada índice tem custo** de armazenamento e escrita

---

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com)
- [Documentação de Índices](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Limites do Firestore](https://firebase.google.com/docs/firestore/quotas)
