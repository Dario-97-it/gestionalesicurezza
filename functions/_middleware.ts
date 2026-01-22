/**
 * Middleware globale per Cloudflare Pages Functions
 * Gestisce: CORS, Autenticazione JWT, Verifica Abbonamento
 */

import { jwtVerify, SignJWT } from 'jose';

// Tipi per Cloudflare
interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
  JWT_SECRET: string;
  ADMIN_SECRET_KEY: string;
  ENVIRONMENT: string;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
  plan: string;
}

// Estendi il context di Pages Functions
declare global {
  interface EventContext<Env, P extends string, Data> {
    auth?: AuthContext;
  }
}

// Paths che non richiedono autenticazione
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/health',
];

// Paths riservati agli admin del sistema (tu)
const ADMIN_PATHS = [
  '/api/admin/',
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Skip auth for public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    const response = await next();
    return addCorsHeaders(response, corsHeaders);
  }

  // Skip auth for static files
  if (!path.startsWith('/api/')) {
    return next();
  }

  // Admin paths require admin key
  if (ADMIN_PATHS.some(p => path.startsWith(p))) {
    const adminKey = request.headers.get('X-Admin-Key');
    if (adminKey !== env.ADMIN_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const response = await next();
    return addCorsHeaders(response, corsHeaders);
  }

  // Extract JWT token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Token mancante' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7);

  try {
    // Verify JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Verify session exists in KV
    const sessionKey = `session:${token.slice(-32)}`;
    const session = await env.SESSIONS.get(sessionKey);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Sessione scaduta' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify subscription status
    const subscriptionKey = `client:${payload.clientId}:subscription`;
    const subscriptionData = await env.SUBSCRIPTIONS.get(subscriptionKey, 'json') as any;
    
    if (!subscriptionData || subscriptionData.status === 'expired' || subscriptionData.status === 'suspended') {
      return new Response(JSON.stringify({ 
        error: 'Abbonamento scaduto o sospeso',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Contatta il supporto per rinnovare il tuo abbonamento.'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check subscription expiry date
    if (subscriptionData.expiresAt && new Date(subscriptionData.expiresAt) < new Date()) {
      // Update subscription status to expired
      await env.SUBSCRIPTIONS.put(subscriptionKey, JSON.stringify({
        ...subscriptionData,
        status: 'expired',
        expiredAt: new Date().toISOString(),
      }));

      return new Response(JSON.stringify({ 
        error: 'Abbonamento scaduto',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Il tuo abbonamento è scaduto. Contatta il supporto per rinnovare.'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add auth context
    (context as any).auth = {
      clientId: payload.clientId as number,
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
      plan: subscriptionData.plan || 'basic',
    };

    const response = await next();
    return addCorsHeaders(response, corsHeaders);

  } catch (error: any) {
    console.error('Auth error:', error);
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      return new Response(JSON.stringify({ error: 'Token scaduto' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Token non valido' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
