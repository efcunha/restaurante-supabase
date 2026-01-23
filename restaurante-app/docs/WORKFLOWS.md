# Project Workflows

This guide documents the common operational tasks for the Restaurante App.

## 🛠️ Build & Development

### Prerequisites

- Node.js (v16+)
- React Native / Expo CLI
- Android Studio / Xcode (for local builds)

### Running Locally

```bash
# Start the Metro bundler
npx expo start

# Clear cache if weird issues happen
npx expo start -c
```

### Building for Android (APK)

We have a helper script `build-android.sh` used to generate the Android build.

```bash
./build-android.sh
```

This typically runs `eas build -p android --profile production --local` (or cloud, depending on config).

## 🚀 Deployment

### Firestore Configuration

The database indices and rules are defined in the project root.

- `firestore.rules`: Security rules.
- `firestore.indexes.json`: Index definitions.

To deploy these changes (requires Firebase CLI):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 🔧 Maintenance & Admin

### Limpar Banco de Dados (Database Cleanup)

In the **Admin Screen**, there is a generic cleanup function ("Limpar Banco") which is useful for testing or resetting a company.

- **Warning**: This physically deletes documents in batches.
- Use `ensureColecaoVazia` utility to guarantee deletion of large datasets (>500 docs).

### Data Correction Tools

The Admin screen often contains hidden or visible buttons for data migrations (e.g., "Corrigir Garçons", "Migrar ItemsWithStatus").

- These are temporary tools written in `AdminScreen.js` to fix schema drift.
- Always check the console logs when running these tools.

### Printer Configuration

1.  Go to **Admin > Configurar Impressora**.
2.  Scan for Bluetooth devices.
3.  Select the thermal printer.
4.  Test print.
    _Note: This configuration is saved locally on the device._
