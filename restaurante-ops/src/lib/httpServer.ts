import { createServer, type IncomingMessage, type RequestListener, type ServerResponse } from 'node:http';

export type OpsRequestListener = RequestListener<typeof IncomingMessage, typeof ServerResponse>;

export function createOpsHttpServer(listener: OpsRequestListener) {
  return createServer(listener);
}