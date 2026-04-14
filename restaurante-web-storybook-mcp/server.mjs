#!/usr/bin/env node

import http from 'node:http';
import { createStorybookMcpHandler } from '@storybook/mcp';

const port = Number.parseInt(process.env.PORT || '13316', 10);
const defaultStorybookBaseUrl = 'https://restaurante-web-storybook-production.up.railway.app';

function resolveStorybookBaseUrl() {
  const raw = (process.env.STORYBOOK_PUBLIC_BASE_URL || '').trim();
  const candidate = (raw || defaultStorybookBaseUrl).replace(/\/$/, '');

  try {
    const parsed = new URL(candidate);
    const hasValidProtocol = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    const hasHostSeparator = parsed.hostname.includes('.');

    if (hasValidProtocol && hasHostSeparator) {
      return candidate;
    }
  } catch {
    // Fall back to default below.
  }

  console.warn(
    `[storybook-mcp] invalid STORYBOOK_PUBLIC_BASE_URL (value=${raw || '(empty)'}), falling back to ${defaultStorybookBaseUrl}`
  );
  return defaultStorybookBaseUrl;
}

const storybookBaseUrl = resolveStorybookBaseUrl();
const mcpFormat = process.env.STORYBOOK_MCP_FORMAT || 'markdown';
const mcpAuthToken = (process.env.STORYBOOK_MCP_AUTH_TOKEN || '').trim();
const allowedOrigins = new Set(
  (process.env.STORYBOOK_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
);

const blockedHeaders = new Set([
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
  'upgrade'
]);

function filterHeaders(headers) {
  const result = {};

  for (const [key, value] of Object.entries(headers)) {
    if (blockedHeaders.has(String(key).toLowerCase())) {
      continue;
    }

    if (typeof value !== 'undefined') {
      result[key] = value;
    }
  }

  return result;
}

function getOrigin(nodeRequest) {
  const origin = nodeRequest.headers.origin;
  return typeof origin === 'string' ? origin : '';
}

function isOriginAllowed(nodeRequest) {
  const origin = getOrigin(nodeRequest);
  return !!origin && allowedOrigins.has(origin);
}

function corsHeaders(nodeRequest) {
  const origin = getOrigin(nodeRequest);

  if (!origin || !allowedOrigins.has(origin)) {
    return {};
  }

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    vary: 'Origin'
  };
}

function writeJson(nodeResponse, statusCode, payload, extraHeaders = {}) {
  nodeResponse.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  nodeResponse.end(JSON.stringify(payload));
}

function ensureOriginAllowed(nodeRequest, nodeResponse) {
  const origin = getOrigin(nodeRequest);
  if (!origin) {
    return true;
  }

  if (isOriginAllowed(nodeRequest)) {
    return true;
  }

  writeJson(nodeResponse, 403, { error: 'forbidden_origin' });
  return false;
}

function bearerTokenFromRequest(nodeRequest) {
  const authHeader = nodeRequest.headers.authorization;
  if (typeof authHeader !== 'string') {
    return '';
  }

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return '';
  }

  return token.trim();
}

function ensureMcpAuthorized(nodeRequest, nodeResponse) {
  if (!mcpAuthToken) {
    writeJson(nodeResponse, 503, { error: 'mcp_auth_not_configured' }, corsHeaders(nodeRequest));
    return false;
  }

  const received = bearerTokenFromRequest(nodeRequest);
  if (!received || received !== mcpAuthToken) {
    // Use 403 to avoid browser-style auth flows triggered by some clients on HTTP 401.
    writeJson(nodeResponse, 403, { error: 'forbidden' }, corsHeaders(nodeRequest));
    return false;
  }

  return true;
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function writeResponse(nodeResponse, webResponse, body) {
  nodeResponse.writeHead(webResponse.status, filterHeaders(Object.fromEntries(webResponse.headers.entries())));
  nodeResponse.end(body);
}

async function proxyStorybook(nodeRequest, nodeResponse, requestBody) {
  const upstreamUrl = new URL(nodeRequest.url || '/', storybookBaseUrl);
  const upstreamResponse = await fetch(upstreamUrl, {
    method: nodeRequest.method,
    headers: filterHeaders(nodeRequest.headers),
    body: requestBody && nodeRequest.method !== 'GET' && nodeRequest.method !== 'HEAD' ? requestBody : undefined
  });

  const body = Buffer.from(await upstreamResponse.arrayBuffer());
  writeResponse(nodeResponse, upstreamResponse, body);
}

const mcpHandler = await createStorybookMcpHandler({
  format: mcpFormat,
  onSessionInitialize: (params) => {
    const clientName = params?.clientInfo?.name || 'unknown-client';
    console.log(`[storybook-mcp] session initialized: ${clientName}`);
  }
});

const server = http.createServer(async (nodeRequest, nodeResponse) => {
  try {
    const pathname = new URL(nodeRequest.url || '/', `http://127.0.0.1:${port}`).pathname;

    if (nodeRequest.method === 'OPTIONS') {
      if (!isOriginAllowed(nodeRequest)) {
        nodeResponse.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
        nodeResponse.end(JSON.stringify({ error: 'forbidden_origin' }));
        return;
      }

      nodeResponse.writeHead(204, corsHeaders(nodeRequest));
      nodeResponse.end();
      return;
    }

    const requestBody = await readBody(nodeRequest);

    if (pathname === '/healthz-internal') {
      writeJson(nodeResponse, 200, { status: 'ok', storybookBaseUrl, service: 'restaurante-web-storybook-mcp' });
      return;
    }

    if (pathname === '/healthz') {
      if (!ensureOriginAllowed(nodeRequest, nodeResponse)) {
        return;
      }

      writeJson(
        nodeResponse,
        200,
        { status: 'ok', storybookBaseUrl, service: 'restaurante-web-storybook-mcp' },
        corsHeaders(nodeRequest)
      );
      return;
    }

    if (pathname === '/mcp') {
      if (!ensureOriginAllowed(nodeRequest, nodeResponse)) {
        return;
      }

      if (!ensureMcpAuthorized(nodeRequest, nodeResponse)) {
        return;
      }

      const request = new Request(`http://127.0.0.1:${port}${nodeRequest.url || '/mcp'}`, {
        method: nodeRequest.method,
        headers: filterHeaders(nodeRequest.headers),
        body: requestBody && nodeRequest.method !== 'GET' && nodeRequest.method !== 'HEAD' ? requestBody : undefined
      });

      const webResponse = await mcpHandler(request);
      const body = Buffer.from(await webResponse.arrayBuffer());
      const responseHeaders = {
        ...Object.fromEntries(webResponse.headers.entries()),
        ...corsHeaders(nodeRequest)
      };
      nodeResponse.writeHead(webResponse.status, filterHeaders(responseHeaders));
      nodeResponse.end(body);
      return;
    }

    await proxyStorybook(nodeRequest, nodeResponse, requestBody);
  } catch (error) {
    console.error('[storybook-mcp] request failed', error);
    nodeResponse.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    nodeResponse.end(JSON.stringify({ error: 'internal_error', message: error instanceof Error ? error.message : String(error) }));
  }
});

server.listen(port, () => {
  console.log(`[storybook-mcp] listening on http://127.0.0.1:${port}`);
  console.log(`[storybook-mcp] proxying Storybook UI to ${storybookBaseUrl}`);
  console.log(
    `[storybook-mcp] hardening active: allowedOrigins=${
      allowedOrigins.size > 0 ? Array.from(allowedOrigins).join(',') : '(none)'
    } authTokenConfigured=${mcpAuthToken ? 'yes' : 'no'}`
  );
});