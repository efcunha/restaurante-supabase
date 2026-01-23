# System Architecture

This document provides a high-level overview of the Restaurante App architecture, explaining how the code is organized and the key patterns used.

## 📂 Project Structure

The project follows a standard React Native / Expo structure with a clear separation of concerns.

```
src/
├── components/         # Reusable UI components
│   ├── comandas/       # Comanda-specific components (Lists, Details, Cards)
│   └── ...
├── config/             # Configuration files (Firebase, Theme)
├── context/            # Global State Management (React Context API)
├── hooks/              # Custom React Hooks
├── screens/            # Application Screens (Views)
├── services/           # Business Logic & External Services (Firestore, Bluetooth)
├── theme/              # Styling constants (colors, spacing)
└── utils/              # Helper functions (Date parsing, Formatting)
```

## 🏗️ Core Patterns

### 1. Context API for State

We use React Context for global state that needs to be accessed across multiple screens.

- **AuthContext**: Manages user authentication (Login/Logout), user role, and the current `companyId`.
- **OrderContext.firestore**: The "brain" of the app. It manages the real-time sync of Orders. It exposes methods like `addOrder`, `updateStatus` which internally call the Service Layer.
- **ToastContext**: Provides a global toast notification system.

### 2. Service Layer

Business logic is encapsulated in `src/services` to keep components clean.

- **ComandasService.js**: Manages the lifecycle of a "Comanda" (creation, adding consumption, payments, closing).
- **OrderFirestoreService.js**: Handles low-level Firestore operations for Orders using efficient queries.
- **PagamentosService.js**: Process payments and integrates with the Cash Register (Caixa).
- **PrinterService.js**: Handles Bluetooth thermal printing (ESC/POS commands).

### 3. Firestore & Optimizations

The app is designed to work in questionable network conditions.

- **FirebaseOptimizations.js**: Implements caching strategies (offline cache) and intelligent query debouncing.
- **Real-time Listeners**: We use `onSnapshot` in `OrderFirestoreService` and `useComandaManagement` to keep the UI in sync with the backend instantly.

## 🔄 Key Data Flows

### Creating an Order

1.  **UI**: User enters data in `NovoPedidoScreen`.
2.  **Hook**: `useNovoPedido` collects local state.
3.  **Context**: `OrderContext.addOrder()` is called.
4.  **Service**: `ComandasService.ensureComandaAberta()` ensures a comanda exists.
5.  **Service**: `OrderFirestoreService.createOrder()` writes the order to Firestore.
6.  **Firestore**: Triggers real-time listeners across all devices (Kitchen, Admin).

### Processing a Payment

1.  **UI**: User selects payment method in `ComandaDetails`.
2.  **Service**: `PagamentosService.registrarPagamento()` is called.
3.  **Transaction**: A Firestore transaction updates the Comanda (increment `totalPago`), creates a `pagamentos` doc, and updates the `caixa`.
4.  **Verification**: If `totalPago >= totalConsumido`, the service automatically closes the comanda.

## 🖨️ Printing System

The printing system traverses a standardized format:

- `PrinterService.printComanda(data)` accepts a JSON object with `{ mesa, cliente, itens: [] }`.
- It converts this JSON into ESC/POS byte commands.
- It scans for connected Bluetooth devices and sends the bytes.
