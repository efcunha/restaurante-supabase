import * as Sentry from '@sentry/react';


export const initSentry = () => {
    Sentry.init({
        dsn: 'https://eb58edf9733b7a7665c969d5680dd482@o4510816056049664.ingest.us.sentry.io/4510816058015744',
        debug: __DEV__, // Enable debug mode in development
        enabled: true, // Always enabled for now to test
        tracesSampleRate: 1.0,
    });
};
