/**
 * Cloudflare Pages Functions - Edge API Gateway
 * Runs in Cloudflare Workers runtime (compatible with Edge Web Crypto API).
 * 
 * Proxies requests to Google Apps Script Private API with HMAC-SHA256 signature,
 * or handles edge session validation and security headers.
 */

interface Env {
  APPS_SCRIPT_URL: string;
  APPS_SCRIPT_SECRET: string;
  SESSION_SECRET: string;
  APP_ENV?: string;
}

type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  data: Record<string, unknown>;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<any>) => void;
}) => Promise<Response> | Response;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS Preflight if cross-origin
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Forward to Google Apps Script endpoint if configured
  if (env.APPS_SCRIPT_URL) {
    try {
      const timestamp = Date.now().toString();
      const nonce = crypto.randomUUID();
      const rawBody = request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : '';

      // Compute HMAC-SHA256 signature
      const secret = env.APPS_SCRIPT_SECRET || 'sec_7f9c381a8b3e4d819e62319f07d2';
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const messageToSign = `${request.method}:${path}:${timestamp}:${nonce}:${rawBody}`;
      const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(messageToSign));
      const signatureHex = Array.from(new Uint8Array(sigBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const gasResponse = await fetch(env.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signatureHex,
          'X-Timestamp': timestamp,
          'X-Nonce': nonce,
          'X-Forwarded-Path': path,
        },
        body: JSON.stringify({
          action: 'proxyApi',
          path,
          method: request.method,
          body: rawBody ? JSON.parse(rawBody) : null,
          query: Object.fromEntries(url.searchParams.entries()),
        }),
      });

      const responseBody = await gasResponse.text();
      return new Response(responseBody, {
        status: gasResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Gateway failure connecting to Google Sheets', details: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Fallback response for unconfigured edge
  return new Response(JSON.stringify({
    message: 'Staff Work Log Cloudflare Edge Gateway active.',
    note: 'Configure APPS_SCRIPT_URL and APPS_SCRIPT_SECRET in Cloudflare Pages Environment Variables to route directly to Google Sheets.',
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
