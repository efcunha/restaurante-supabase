import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const CSP_BY_PROFILE = {
  default: [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "media-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
  site: [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https:",
    "media-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
};

function buildSecurityHeaders(profile) {
  const csp = CSP_BY_PROFILE[profile] ?? CSP_BY_PROFILE.default;
  return {
    'Content-Security-Policy': csp,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), serial=(), usb=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRequestPath(rootDir, pathname, spaFallback) {
  const safePath = decodeURIComponent(pathname).replace(/\0/g, '');
  const normalized = path.normalize(safePath).replace(/^([.][.][/\\])+/, '');
  const relativePath = normalized.replace(/^[/\\]+/, '');
  const absoluteBase = path.resolve(rootDir);

  const candidates = [];
  if (!relativePath) {
    candidates.push(path.join(absoluteBase, 'index.html'));
  } else {
    candidates.push(path.join(absoluteBase, relativePath));
    candidates.push(path.join(absoluteBase, `${relativePath}.html`));
    candidates.push(path.join(absoluteBase, relativePath, 'index.html'));
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(absoluteBase)) {
      continue;
    }
    if (await fileExists(resolved)) {
      return resolved;
    }
  }

  if (!spaFallback) {
    return null;
  }

  const fallbackFile = path.join(absoluteBase, 'index.html');
  return (await fileExists(fallbackFile)) ? fallbackFile : null;
}

export function startStaticServer({
  rootDir,
  port = Number(process.env.PORT || 3000),
  spaFallback = true,
  profile = 'default',
}) {
  const absoluteRootDir = path.resolve(rootDir);
  const securityHeaders = buildSecurityHeaders(profile);
  const maxConcurrentRequests = Number(process.env.STATIC_SERVER_MAX_CONCURRENT_REQUESTS || 200);
  let activeRequests = 0;

  const server = http.createServer(async (req, res) => {
    if (activeRequests >= maxConcurrentRequests) {
      res.writeHead(503, {
        ...securityHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '1',
      });
      res.end('Service unavailable');
      return;
    }

    activeRequests += 1;
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const filePath = await resolveRequestPath(absoluteRootDir, requestUrl.pathname, spaFallback);

      if (!filePath) {
        res.writeHead(404, {
          ...securityHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end('Not found');
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[extension] ?? 'application/octet-stream';
      const cacheControl =
        extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';

      res.writeHead(200, {
        ...securityHeaders,
        'Cache-Control': cacheControl,
        'Content-Type': contentType,
      });

      createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error('Static server request error', error);
      res.writeHead(500, {
        ...securityHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Internal Server Error');
    } finally {
      activeRequests -= 1;
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Static security server running on port ${port}, serving ${absoluteRootDir}`);
  });

  return server;
}
