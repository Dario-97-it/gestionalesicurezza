/**
 * Middleware - Autenticazione JWT
 * Verifica il token JWT e passa il contesto autenticato alle route
 */

import { jwtVerify } from 'jose';

interface Env {
  JWT_SECRET: string;
  DB: D1Database;
  SESSIONS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
  isClientAdmin: boolean;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Skip auth per login, refresh e health check
  const url = new URL(request.url);
  if (url.pathname === '/api/auth/login' || 
      url.pathname === '/api/auth/refresh' ||
      url.pathname === '/api/health') {
    return context.next();
  }

  try {
    // Estrai il token dall'header Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token mancante' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);

    // Verifica che JWT_SECRET sia configurato
    if (!env.JWT_SECRET) {
      console.error('JWT_SECRET non configurato!');
      return new Response(JSON.stringify({ error: 'Configurazione server non valida' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica il token JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const verified = await jwtVerify(token, secret);
    
    // Passa il contesto autenticato al context
    (context as any).auth = verified.payload as AuthContext;

    return context.next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);
    return new Response(JSON.stringify({ error: 'Token non valido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
