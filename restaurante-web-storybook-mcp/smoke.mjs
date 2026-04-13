#!/usr/bin/env node

const baseUrl = (process.env.STORYBOOK_MCP_BASE_URL || 'http://127.0.0.1:13316').replace(/\/$/, '');
const authToken = process.env.STORYBOOK_MCP_AUTH_TOKEN || '';
const allowedOrigin = process.env.STORYBOOK_MCP_ALLOWED_ORIGIN || 'http://localhost:6006';

if (!authToken) {
  console.error('Missing STORYBOOK_MCP_AUTH_TOKEN for smoke tests.');
  process.exit(1);
}

async function main() {
  const internalHealthResponse = await fetch(`${baseUrl}/healthz-internal`);
  const internalHealthText = await internalHealthResponse.text();

  if (internalHealthResponse.status !== 200) {
    throw new Error(`Unexpected /healthz-internal status: ${internalHealthResponse.status} :: ${internalHealthText}`);
  }

  const healthResponse = await fetch(`${baseUrl}/healthz`, {
    headers: { Origin: allowedOrigin }
  });
  const healthText = await healthResponse.text();

  if (healthResponse.status !== 200) {
    throw new Error(`Unexpected /healthz status: ${healthResponse.status} :: ${healthText}`);
  }

  const unauthorizedMcpResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
  });

  if (unauthorizedMcpResponse.status !== 401) {
    throw new Error(`Unexpected /mcp unauth status: ${unauthorizedMcpResponse.status}`);
  }

  const mcpResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      Origin: allowedOrigin,
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
  });
  const mcpText = await mcpResponse.text();

  if (mcpResponse.status !== 200) {
    throw new Error(`Unexpected /mcp status: ${mcpResponse.status} :: ${mcpText}`);
  }

  if (!mcpText.includes('get-documentation') && !mcpText.includes('list-all-documentation')) {
    throw new Error(`Unexpected tools/list payload: ${mcpText}`);
  }

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});