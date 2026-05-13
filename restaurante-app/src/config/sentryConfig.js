import * as Sentry from '@sentry/react-native';

// Arquivo legado — use sentryConfig.ts em TypeScript.
// DSN público do projeto restaurante-app em machado-cunha-soft-house.sentry.io
export const initSentry = () => {
    Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? 'https://540e5308ba1986bc2bb85757511d33a1@o1148932.ingest.us.sentry.io/4511163001470976',
        debug: __DEV__,
        enabled: !__DEV__,
        tracesSampleRate: 1.0,
    });
};
