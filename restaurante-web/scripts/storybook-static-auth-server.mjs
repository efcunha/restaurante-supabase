#!/usr/bin/env node

// This server binds to an internal port. TLS termination is handled at the
// Railway ingress reverse proxy — plain HTTP inside the container is correct.
import http from 'node:http'; // nosnyk
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const staticDirName = (process.env.STORYBOOK_STATIC_DIR || 'storybook-static').trim() || 'storybook-static';
const distDir = path.resolve(rootDir, staticDirName);
const port = Number.parseInt(process.env.PORT || '8080', 10);

const basicUser = (process.env.STORYBOOK_BASIC_AUTH_USER || '').trim();
const basicPass = (process.env.STORYBOOK_BASIC_AUTH_PASS || '').trim();

const mimeByExt = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function unauthorized(res) {
  res.writeHead(401, {
    'content-type': 'application/json; charset=utf-8',
    'www-authenticate': 'Basic realm="storybook"'
  });
  res.end(JSON.stringify({ error: 'unauthorized' }));
}

function serviceUnavailable(res) {
  res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'storybook_basic_auth_not_configured' }));
}

function isAuthorized(req) {
  if (!basicUser || !basicPass) {
    return 'misconfigured';
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const encoded = authHeader.slice('Basic '.length).trim();
  let decoded = '';

  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIdx = decoded.indexOf(':');
  if (separatorIdx < 0) {
    return false;
  }

  const user = decoded.slice(0, separatorIdx);
  const pass = decoded.slice(separatorIdx + 1);
  return user === basicUser && pass === basicPass;
}

function safePathFromUrl(urlString) {
  const pathname = new URL(urlString || '/', `http://127.0.0.1:${port}`).pathname;
  let decoded = '/';

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  // Allow only conservative static path chars to reduce injection surface.
  if (!/^\/[A-Za-z0-9._\/-]*$/.test(decoded)) {
    return null;
  }

  const normalized = path.normalize(decoded);
  const segments = normalized.split(/[\\/]+/).filter(Boolean);
  if (segments.some((segment) => segment === '..')) {
    return null;
  }

  const relative = normalized.replace(/^([/\\])+/, '');
  return relative;
}

async function resolveFilePath(relativePath) {
  const requestedPath = path.resolve(distDir, relativePath);
  if (!requestedPath.startsWith(distDir)) {
    return null;
  }

  try {
    const fileStat = await stat(requestedPath);
    if (fileStat.isFile()) {
      return requestedPath;
    }

    if (fileStat.isDirectory()) {
      const indexPath = path.join(requestedPath, 'index.html');
      const indexStat = await stat(indexPath);
      if (indexStat.isFile()) {
        return indexPath;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function serveFile(res, absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  const contentType = mimeByExt[ext] || 'application/octet-stream';
  const body = await readFile(absolutePath);
  res.writeHead(200, {
    'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=300',
    'content-type': contentType,
    'x-content-type-options': 'nosniff'
  });
  res.end(body);
}

async function requestHandler(req, res) {
  const pathname = new URL(req.url || '/', `https://127.0.0.1:${port}`).pathname;

  if (pathname === '/healthz-internal') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', service: 'restaurante-web-storybook' }));
    return;
  }

  const authStatus = isAuthorized(req);
  if (authStatus === 'misconfigured') {
    serviceUnavailable(res);
    return;
  }

  if (!authStatus) {
    unauthorized(res);
    return;
  }

  const relativePath = safePathFromUrl(req.url || '/');
  if (relativePath === null) {
    res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'invalid_path' }));
    return;
  }

  const resolved = await resolveFilePath(relativePath);

  if (resolved) {
    await serveFile(res, resolved);
    return;
  }

  const spaFallback = path.join(distDir, 'index.html');
  try {
    await serveFile(res, spaFallback);
  } catch {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not_found' }));
  }
}

const server = http.createServer((req, res) => {
  requestHandler(req, res).catch((error) => {
    console.error('[storybook-static-auth] request failed', error);
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'internal_error' }));
  });
});

server.listen(port, () => {
  console.log(`[storybook-static-auth] listening on http://127.0.0.1:${port}`); // TLS terminated at Railway ingress
  console.log(`[storybook-static-auth] distDir=${distDir}`);
  console.log(`[storybook-static-auth] staticDirName=${staticDirName}`);
  console.log(`[storybook-static-auth] basicAuthConfigured=${basicUser && basicPass ? 'yes' : 'no'}`);
});
