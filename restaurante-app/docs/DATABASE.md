# Database Schema (Firestore)

The application uses Google Firestore (NoSQL). Since Firestore is schema-less, this document acts as the reference for the expected data structure.

All collections are generally namespaced by `companies/{companyId}/...` to support multi-tenancy.

## 📂 Collections Structure

```
companies/{companyId}/
├── pedidos/             # Individual orders (kitchen tickets)
├── comandas/            # Groups of orders (customer bill)
├── pagamentos/          # Payment transaction records
└── caixa/               # Cash register shifts (open/close)
```

## 📄 Data Models

### 1. Pedido (Order)

A request for items to be prepared.

```json
{
  "id": "AutoID",
  "idFormatado": "#001",
  "comandaNumber": "10",
  "mesa": "5",
  "client": "John Doe",
  "dateKey": "2023-10-27", // YYYY-MM-DD (Partition key)
  "status": "churrasqueira", // churrasqueira | montagem | prontos | entregue
  "items": ["1x Picanha", "2x Cola"],
  "totalPrice": 150.0,
  "isPago": false,
  "createdAt": "ISO Timestamp",
  "updatedAt": "ISO Timestamp",
  "createdBy": "userId",
  "createdByName": "Waiter Name"
}
```

### 2. Comanda (Bill)

Aggregates orders for a customer/table.

```json
{
  "id": "comanda-2023-10-27-10", // Composite ID: comanda-{date}-{number}
  "comandaNumber": "10",
  "dateKey": "2023-10-27",
  "status": "aberta", // aberta | fechada | cancelada
  "mesa": "5",
  "cliente": "John Doe",
  "totalConsumido": 150.0,
  "totalPago": 50.0,
  "saldoAberto": 100.0,
  "pagamentosResumo": {
    // Aggregated totals
    "dinheiro": 50.0,
    "pix": 0
  },
  "abertaAt": "Timestamp",
  "fechadaAt": "Timestamp"
}
```

### 3. Pagamento (Payment)

A single financial transaction.

```json
{
  "id": "AutoID",
  "comandaId": "comanda-2023-10-27-10",
  "comandaNumber": "10",
  "dateKey": "2023-10-27",
  "valor": 50.0,
  "forma": "dinheiro", // dinheiro | pix | debito | credito
  "usuarioId": "userId", // Who received it
  "usuarioNome": "Cashier Name",
  "garcom": "userId", // Waiter attributed to the table
  "createdAt": "Timestamp"
}
```

## 🔍 Indexing Strategy

To support the queries used in the app, the following composite indexes are required in `firestore.indexes.json`:

1.  **Pedidos**: `companyId` ASC, `dateKey` ASC, `numeroComanda` ASC
    - Used for: `findOrdersByComanda`
2.  **Comandas**: `companyId` ASC, `dateKey` ASC, `status` ASC, `comandaNumber` ASC
    - Used for: `listarComandasAbertas`
3.  **Pagamentos**: `companyId` ASC, `dateKey` ASC
    - Used for: Financial reports

## 🛡️ Security Rules (Overview)

- **Auth**: User must be authenticated (`request.auth != null`).
- **Tenancy**: User can only access collections inside `companies/{user.companyId}`.
- **Validation**: Basic validation ensures `totalPrice` is a number and required fields exist.
