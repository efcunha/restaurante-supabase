#!/usr/bin/env node

// This server binds to an internal port. TLS termination is handled at the
// Railway ingress reverse proxy — plain HTTP inside the container is correct.
import http from 'node:http'; // nosnyk
import { createStorybookMcpHandler } from '@storybook/mcp';

const port = Number.parseInt(process.env.PORT || '13316', 10);
const storybookBaseUrl = (process.env.STORYBOOK_PUBLIC_BASE_URL || 'https://restaurante-web-storybook-production.up.railway.app').replace(/\/$/, '');
const mcpFormat = process.env.STORYBOOK_MCP_FORMAT || 'markdown';

const hopByHopHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function filterHeaders(headers) {
  const filtered = {};

  for (const [key, value] of Object.entries(headers)) {
    if (hopByHopHeaders.has(String(key).toLowerCase())) {
      continue;
    }

    if (typeof value !== 'undefined') {
      filtered[key] = value;
    }
  }

  return filtered;
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return Buffer.concat(chunks);
}

function writeNodeResponse(nodeResponse, webResponse, bodyBuffer) {
  const headers = filterHeaders(Object.fromEntries(webResponse.headers.entries()));
  nodeResponse.writeHead(webResponse.status, headers);
  nodeResponse.end(bodyBuffer);
}

async function proxyToPublicStorybook(nodeRequest, nodeResponse, requestBody) {
  const url = new URL(nodeRequest.url || '/', storybookBaseUrl);
  const upstreamResponse = await fetch(url, {
    method: nodeRequest.method,
    headers: filterHeaders(nodeRequest.headers),
    body: requestBody && nodeRequest.method !== 'GET' && nodeRequest.method !== 'HEAD' ? requestBody : undefined,
  });

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
  writeNodeResponse(nodeResponse, upstreamResponse, responseBody);
}

const mcpHandler = await createStorybookMcpHandler({
  format: mcpFormat,
  onSessionInitialize: (params) => {
    const clientName = params?.clientInfo?.name || 'unknown-client';
    console.log(`[storybook-mcp] session initialized: ${clientName}`);
  },
});

const server = http.createServer(async (nodeRequest, nodeResponse) => {
  try {
    const pathname = new URL(nodeRequest.url || '/', `http://127.0.0.1:${port}`).pathname;
    const requestBody = await readRequestBody(nodeRequest);

    if (pathname === '/healthz') {
      nodeResponse.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      nodeResponse.end(
        JSON.stringify({
          status: 'ok',
          service: 'restaurante-web-storybook-mcp',
          storybookBaseUrl,
        })
      );
      return;
    }

    if (pathname === '/mcp') {
      const request = new Request(`http://127.0.0.1:${port}${nodeRequest.url || '/mcp'}`, {
        method: nodeRequest.method,
        headers: filterHeaders(nodeRequest.headers),
        body: requestBody && nodeRequest.method !== 'GET' && nodeRequest.method !== 'HEAD' ? requestBody : undefined,
      });

      const webResponse = await mcpHandler(request);
      const bodyBuffer = Buffer.from(await webResponse.arrayBuffer());
      writeNodeResponse(nodeResponse, webResponse, bodyBuffer);
      return;
    }

    await proxyToPublicStorybook(nodeRequest, nodeResponse, requestBody);
  } catch (error) {
    console.error('[storybook-mcp] request failed', error);
    nodeResponse.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    nodeResponse.end(
      JSON.stringify({
        error: 'internal_error',
        message: error instanceof Error ? error.message : String(error),
      })
    );
  }
});

server.listen(port, () => {
  console.log(`[storybook-mcp] listening on http://127.0.0.1:${port}`); // TLS terminated at Railway ingress
  console.log(`[storybook-mcp] proxying Storybook UI to ${storybookBaseUrl}`);
});