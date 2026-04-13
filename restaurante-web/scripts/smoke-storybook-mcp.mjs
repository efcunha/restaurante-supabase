#!/usr/bin/env node

const baseUrl = (process.env.STORYBOOK_MCP_BASE_URL || 'http://127.0.0.1:13316').replace(/\/$/, '');

async function assertJson(url, expectedStatus) {
  const response = await fetch(url);
  const text = await response.text();

  if (response.status !== expectedStatus) {
    throw new Error(`Unexpected status for ${url}: ${response.status} :: ${text}`);
  }

  return text;
}

async function main() {
  const healthText = await assertJson(`${baseUrl}/healthz`, 200);
  const health = JSON.parse(healthText);

  const mcpResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });

  const mcpText = await mcpResponse.text();

  if (mcpResponse.status !== 200) {
    throw new Error(`Unexpected MCP status: ${mcpResponse.status} :: ${mcpText}`);
  }

  if (!mcpText.includes('preview-stories') && !mcpText.includes('get-documentation')) {
    throw new Error(`MCP tools/list response did not contain expected tools: ${mcpText}`);
  }

  console.log(JSON.stringify({
    ok: true,
    health,
    mcpStatus: mcpResponse.status,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});