import { createServer as createHttpServer, type IncomingMessage, type RequestListener, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { OpsEnv } from '../config/env.js';

export type OpsRequestListener = RequestListener<typeof IncomingMessage, typeof ServerResponse>;

export function createOpsHttpServer(listener: OpsRequestListener, env: OpsEnv) {
  const hasInlineTls = Boolean(env.OPS_TLS_KEY_PEM && env.OPS_TLS_CERT_PEM);

  if (hasInlineTls) {
    return createHttpsServer(
      {
        key: env.OPS_TLS_KEY_PEM,
        cert: env.OPS_TLS_CERT_PEM,
      },
      listener,
    );
  }

  if (env.OPS_ENV === 'production' && !env.OPS_ALLOW_PLAINTEXT_HTTP) {
    throw new Error(
      'Insecure transport blocked: configure OPS_TLS_KEY_PEM/OPS_TLS_CERT_PEM or set OPS_ALLOW_PLAINTEXT_HTTP=true when behind trusted TLS proxy.',
    );
  }

  return createHttpServer(listener);
}