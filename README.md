# Restaurante App 🍽️

A complete mobile solution for restaurant management, handling everything from order taking to kitchen display and financial reporting.

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:

- [**Architecture**](docs/ARCHITECTURE.md): Code codebase organization, patterns, and state management.
- [**Database**](docs/DATABASE.md): Firestore schema, data models, and indexing strategy.
- [**Workflows**](docs/WORKFLOWS.md): Build instructions, deployment, and maintenance guides.

## 🚀 Quick Start

### Prerequisites

- Node.js & npm/yarn
- Expo CLI
- Firebase Project configured

### Installation

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Setup**:
    - Copy `.env.example` to `.env` (if applicable) or ensure `src/config/firebaseConfig.js` has valid credentials.

### Running the App

```bash
npx expo start
```

Scan the QR code with your phone (Expo Go) or run on an emulator.

## ✨ Key Features

- **Order Management**: Real-time order creation and tracking (Churrasqueira -> Montagem -> Prontos).
- **Kitchen Display System (KDS)**: Dedicated screens for kitchen staff.
- **Financials**: Closings, Cash Management (Caixa), and Reporting.
- **Offline-First**: Robust handling of connection loss with offline caching.
- **Printing**: Bluetooth thermal printer integration.

## 📱 Tech Stack

- **Framework**: React Native (Expo)
- **Backend**: Firebase Firestore & Auth
- **State**: React Context API
- **UI**: Custom components (StyleSheet)

---

_Built for efficiency and reliability in high-paced restaurant environments._
