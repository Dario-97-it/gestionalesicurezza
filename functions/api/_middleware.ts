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

// Route pubbliche che non richiedono autenticazione
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/health',
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Permetti route pubbliche
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return next();
  }

  // Estrai token dall'header Authorization
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Token mancante' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.substring(7);

  try {
    // Verifica JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Imposta contesto autenticazione
    const auth: AuthContext = {
      clientId: payload.clientId as number,
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
      isClientAdmin: payload.isClientAdmin as boolean || false,
    };

    // Passa il contesto alle route successive
    context.data.auth = auth;

    return next();

  } catch (error: any) {
    console.error('JWT verification failed:', error.message);
    
    // Token scaduto o invalido
    return new Response(JSON.stringify({ 
      error: 'Token non valido o scaduto',
      code: 'TOKEN_EXPIRED'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
