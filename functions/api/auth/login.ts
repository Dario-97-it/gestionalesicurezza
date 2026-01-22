/**
 * API Login - Autenticazione utenti
 * POST /api/auth/login
 */

import { SignJWT } from 'jose';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';
import bcryptjs from 'bcryptjs';

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
  JWT_SECRET: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

// Verifica password usando bcryptjs
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcryptjs.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validazione input
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email e password richiesti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Cerca prima negli utenti (dipendenti del cliente)
    const users = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    let authUser: any = null;
    let clientData: any = null;
    let isClientAdmin = false;

    if (users.length > 0) {
      const user = users[0];
      
      // Verifica password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Credenziali non valide' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verifica che l'utente sia attivo
      if (!user.isActive) {
        return new Response(JSON.stringify({ error: 'Account disabilitato' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Ottieni dati cliente
      const clients = await db.select()
        .from(schema.clients)
        .where(eq(schema.clients.id, user.clientId))
        .limit(1);

      if (clients.length === 0) {
        return new Response(JSON.stringify({ error: 'Cliente non trovato' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      clientData = clients[0];
      authUser = user;

    } else {
      // Cerca nei clienti (admin del cliente)
      const clients = await db.select()
        .from(schema.clients)
        .where(eq(schema.clients.email, email.toLowerCase()))
        .limit(1);

      if (clients.length === 0) {
        return new Response(JSON.stringify({ error: 'Credenziali non valide' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const client = clients[0];
      
      // Verifica password
      const isValid = await verifyPassword(password, client.passwordHash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Credenziali non valide' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      clientData = client;
      authUser = {
        id: 0, // Client admin ha userId 0
        clientId: client.id,
        email: client.email,
        name: client.contactPerson || client.name,
        role: 'admin',
      };
      isClientAdmin = true;
    }

    // Verifica stato abbonamento
    const subscriptionKey = `client:${clientData.id}:subscription`;
    let subscriptionData = await env.SUBSCRIPTIONS.get(subscriptionKey, 'json') as any;

    // Se non esiste, crea dalla tabella clients
    if (!subscriptionData) {
      subscriptionData = {
        status: clientData.subscriptionStatus,
        plan: clientData.plan,
        expiresAt: clientData.subscriptionExpiresAt,
        createdAt: clientData.createdAt,
      };
      await env.SUBSCRIPTIONS.put(subscriptionKey, JSON.stringify(subscriptionData), {
        expirationTtl: 86400 * 30, // 30 giorni
      });
    }

    // Verifica che l'abbonamento sia attivo
    if (subscriptionData.status === 'expired' || subscriptionData.status === 'suspended') {
      return new Response(JSON.stringify({ 
        error: 'Abbonamento scaduto o sospeso',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Contatta il supporto per rinnovare il tuo abbonamento.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Genera JWT access token
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const accessToken = await new SignJWT({
      clientId: clientData.id,
      userId: authUser.id,
      email: authUser.email,
      role: authUser.role,
      isClientAdmin,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Genera refresh token
    const refreshToken = await new SignJWT({
      clientId: clientData.id,
      userId: authUser.id,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    // Salva sessione in KV
    const sessionKey = `session:${accessToken.slice(-32)}`;
    await env.SESSIONS.put(sessionKey, JSON.stringify({
      clientId: clientData.id,
      userId: authUser.id,
      email: authUser.email,
      createdAt: new Date().toISOString(),
    }), {
      expirationTtl: 86400, // 24 ore
    });

    // Salva refresh token in KV
    const refreshKey = `refresh:${refreshToken.slice(-32)}`;
    await env.SESSIONS.put(refreshKey, JSON.stringify({
      clientId: clientData.id,
      userId: authUser.id,
    }), {
      expirationTtl: 604800, // 7 giorni
    });

    // Aggiorna lastLoginAt
    if (isClientAdmin) {
      await db.update(schema.clients)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(schema.clients.id, clientData.id));
    } else {
      await db.update(schema.users)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(schema.users.id, authUser.id));
    }

    return new Response(JSON.stringify({
      accessToken,
      refreshToken,
      expiresIn: 86400,
      user: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
      },
      client: {
        id: clientData.id,
        name: clientData.name,
        plan: subscriptionData.plan,
        subscriptionStatus: subscriptionData.status,
        subscriptionExpiresAt: subscriptionData.expiresAt,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
