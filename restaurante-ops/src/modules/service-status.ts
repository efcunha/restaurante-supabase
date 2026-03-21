import { buildEnv } from '../config/env.js';

const env = buildEnv();

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'unknown';
  responseTime?: number;
  url?: string;
}

async function checkServiceHealth(name: string, url: string): Promise<ServiceStatus> {
  if (!url) return { name, status: 'unknown', url };

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - start;
    const status = res.ok ? 'online' : 'offline';
    return { name, status, responseTime, url };
  } catch (_err) {
    return { name, status: 'offline', url };
  }
}

export async function checkAllServices(): Promise<ServiceStatus[]> {
  const opsUrl = env.OPS_PUBLIC_BASE_URL ? `${env.OPS_PUBLIC_BASE_URL}/healthz` : undefined;
  const webUrl = env.WEB_BASE_URL ? `${env.WEB_BASE_URL}/healthz` : undefined;
  const activepiecesUrl = env.ACTIVEPIECES_BASE_URL ? `${env.ACTIVEPIECES_BASE_URL}/health` : undefined;
  const evolutionUrl = env.EVOLUTION_API_BASE_URL ? `${env.EVOLUTION_API_BASE_URL}/health` : undefined;

  const [ops, web, activepieces, evolution] = await Promise.all([
    opsUrl ? checkServiceHealth('restaurante-ops', opsUrl) : Promise.resolve({ name: 'restaurante-ops', status: 'unknown' as const }),
    webUrl ? checkServiceHealth('restaurante-web', webUrl) : Promise.resolve({ name: 'restaurante-web', status: 'unknown' as const }),
    activepiecesUrl ? checkServiceHealth('activepieces', activepiecesUrl) : Promise.resolve({ name: 'activepieces', status: 'unknown' as const }),
    evolutionUrl ? checkServiceHealth('evolution-api', evolutionUrl) : Promise.resolve({ name: 'evolution-api', status: 'unknown' as const }),
  ]);

  return [ops, web, activepieces, evolution];
}
