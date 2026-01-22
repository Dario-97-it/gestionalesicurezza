/**
 * API Me - Informazioni utente corrente
 * GET /api/auth/me
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
  SUBSCRIPTIONS: KVNamespace;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
  plan: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const auth = (context as any).auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Ottieni dati cliente
    const clients = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.id, auth.clientId))
      .limit(1);

    if (clients.length === 0) {
      return new Response(JSON.stringify({ error: 'Cliente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientData = clients[0];

    // Ottieni dati utente se non è client admin
    let userData: any = null;
    if (auth.userId !== 0) {
      const users = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, auth.userId))
        .limit(1);

      if (users.length > 0) {
        userData = users[0];
      }
    }

    // Ottieni stato abbonamento
    const subscriptionKey = `client:${auth.clientId}:subscription`;
    const subscriptionData = await env.SUBSCRIPTIONS.get(subscriptionKey, 'json') as any;

    return new Response(JSON.stringify({
      user: {
        id: auth.userId,
        email: userData?.email || clientData.email,
        name: userData?.name || clientData.contactPerson || clientData.name,
        role: userData?.role || 'admin',
        isClientAdmin: auth.userId === 0,
      },
      client: {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        plan: subscriptionData?.plan || clientData.plan,
        subscriptionStatus: subscriptionData?.status || clientData.subscriptionStatus,
        subscriptionExpiresAt: subscriptionData?.expiresAt || clientData.subscriptionExpiresAt,
        maxUsers: clientData.maxUsers,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Me error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
