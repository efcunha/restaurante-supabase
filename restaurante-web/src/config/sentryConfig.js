import * as Sentry from '@sentry/react';

// Arquivo legado — use sentryConfig.ts em TypeScript.
// DSN público do projeto restaurante-web em machado-cunha-soft-house.sentry.io
export const initSentry = () => {
    Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? 'https://b5e23df1080307e3b604b32e4d7f63b6@o1148932.ingest.us.sentry.io/4511163013791744',
        debug: false,
        enabled: process.env.NODE_ENV !== 'development',
        tracesSampleRate: 1.0,
    });
};
