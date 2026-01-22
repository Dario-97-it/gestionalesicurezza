/**
 * Middleware - Autenticazione JWT
 * Verifica il token JWT e passa il contesto autenticato alle route
 */

import { jwtVerify } from 'jose';

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
  isClientAdmin: boolean;
}

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const env = context.env as any;

  // Skip auth per login e health check
  if (request.url.includes('/api/auth/login') || 
      request.url.includes('/api/auth/refresh') ||
      request.url.includes('/api/health')) {
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

    // Verifica il token JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET || 'default-secret');
    const verified = await jwtVerify(token, secret);
    
    // Passa il contesto autenticato al context
    (context as any).auth = verified.payload as AuthContext;

    return context.next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return new Response(JSON.stringify({ error: 'Token non valido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
