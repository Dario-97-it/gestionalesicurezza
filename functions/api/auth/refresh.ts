/**
 * API Refresh Token - Rinnovo access token
 * POST /api/auth/refresh
 */

import { SignJWT, jwtVerify } from 'jose';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
  JWT_SECRET: string;
}

interface RefreshRequest {
  refreshToken: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: RefreshRequest = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return new Response(JSON.stringify({ error: 'Refresh token richiesto' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica refresh token
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    let payload: any;
    
    try {
      const result = await jwtVerify(refreshToken, secret);
      payload = result.payload;
    } catch (error: any) {
      return new Response(JSON.stringify({ error: 'Refresh token non valido o scaduto' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica che sia un refresh token
    if (payload.type !== 'refresh') {
      return new Response(JSON.stringify({ error: 'Token non valido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica refresh token in KV
    const refreshKey = `refresh:${refreshToken.slice(-32)}`;
    const refreshData = await env.SESSIONS.get(refreshKey, 'json') as any;
    
    if (!refreshData) {
      return new Response(JSON.stringify({ error: 'Refresh token scaduto o revocato' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Ottieni dati cliente
    const clients = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.id, payload.clientId))
      .limit(1);

    if (clients.length === 0) {
      return new Response(JSON.stringify({ error: 'Cliente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientData = clients[0];

    // Verifica stato abbonamento
    const subscriptionKey = `client:${clientData.id}:subscription`;
    const subscriptionData = await env.SUBSCRIPTIONS.get(subscriptionKey, 'json') as any;

    if (!subscriptionData || subscriptionData.status === 'expired' || subscriptionData.status === 'suspended') {
      return new Response(JSON.stringify({ 
        error: 'Abbonamento scaduto o sospeso',
        code: 'SUBSCRIPTION_EXPIRED'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ottieni dati utente se non è client admin
    let userData: any = null;
    let isClientAdmin = payload.userId === 0;

    if (!isClientAdmin) {
      const users = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, payload.userId))
        .limit(1);

      if (users.length > 0) {
        userData = users[0];
        if (!userData.isActive) {
          return new Response(JSON.stringify({ error: 'Account disabilitato' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Genera nuovo access token
    const newAccessToken = await new SignJWT({
      clientId: clientData.id,
      userId: payload.userId,
      email: userData?.email || clientData.email,
      role: userData?.role || 'admin',
      isClientAdmin,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Genera nuovo refresh token (rotazione)
    const newRefreshToken = await new SignJWT({
      clientId: clientData.id,
      userId: payload.userId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    // Salva nuova sessione in KV
    const sessionKey = `session:${newAccessToken.slice(-32)}`;
    await env.SESSIONS.put(sessionKey, JSON.stringify({
      clientId: clientData.id,
      userId: payload.userId,
      email: userData?.email || clientData.email,
      createdAt: new Date().toISOString(),
    }), {
      expirationTtl: 86400,
    });

    // Salva nuovo refresh token in KV
    const newRefreshKey = `refresh:${newRefreshToken.slice(-32)}`;
    await env.SESSIONS.put(newRefreshKey, JSON.stringify({
      clientId: clientData.id,
      userId: payload.userId,
    }), {
      expirationTtl: 604800,
    });

    // Elimina vecchio refresh token
    await env.SESSIONS.delete(refreshKey);

    return new Response(JSON.stringify({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 86400,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Refresh error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
