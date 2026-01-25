/**
 * API Admin Subscriptions - Gestione abbonamenti clienti
 * GET /api/admin/subscriptions/:clientId - Ottieni stato abbonamento
 * PUT /api/admin/subscriptions/:clientId - Aggiorna abbonamento
 * DELETE /api/admin/subscriptions/:clientId - Disabilita abbonamento
 * 
 * Richiede header X-Admin-Key
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
}

// GET - Ottieni stato abbonamento
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const clientId = parseInt(params.clientId as string);

  if (isNaN(clientId)) {
    return new Response(JSON.stringify({ error: 'ID cliente non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Ottieni dati cliente
    const clients = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (clients.length === 0) {
      return new Response(JSON.stringify({ error: 'Cliente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientData = clients[0];

    // Ottieni stato abbonamento da KV
    const subscriptionKey = `client:${clientId}:subscription`;
    const subscriptionData = await env.SUBSCRIPTIONS.get(subscriptionKey, 'json') as any;

    return new Response(JSON.stringify({
      client: {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        createdAt: clientData.createdAt,
        lastLoginAt: clientData.lastLoginAt,
      },
      subscription: subscriptionData || {
        status: clientData.subscriptionStatus,
        plan: clientData.plan,
        expiresAt: clientData.subscriptionExpiresAt,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get subscription error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna abbonamento (attiva/rinnova)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const clientId = parseInt(params.clientId as string);

  if (isNaN(clientId)) {
    return new Response(JSON.stringify({ error: 'ID cliente non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const { status, plan, expiresAt, notes } = body;

    const db = drizzle(env.DB, { schema });

    // Verifica che il cliente esista
    const clients = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (clients.length === 0) {
      return new Response(JSON.stringify({ error: 'Cliente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggiorna database
    await db.update(schema.clients)
      .set({
        subscriptionStatus: status || 'active',
        plan: plan || 'pro',
        subscriptionExpiresAt: expiresAt,
        notes: notes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.clients.id, clientId));

    // Aggiorna KV
    const subscriptionKey = `client:${clientId}:subscription`;
    await env.SUBSCRIPTIONS.put(subscriptionKey, JSON.stringify({
      status: status || 'active',
      plan: plan || 'pro',
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    }), {
      expirationTtl: 86400 * 365, // 1 anno
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Abbonamento cliente ${clientId} aggiornato`,
      subscription: {
        status: status || 'active',
        plan: plan || 'pro',
        expiresAt: expiresAt,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update subscription error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Disabilita abbonamento
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const clientId = parseInt(params.clientId as string);

  if (isNaN(clientId)) {
    return new Response(JSON.stringify({ error: 'ID cliente non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let reason = 'non-payment';
    try {
      const body = await request.json() as any;
      reason = body.reason || 'non-payment';
    } catch {
      // Ignora se non c'è body
    }

    const db = drizzle(env.DB, { schema });

    // Verifica che il cliente esista
    const clients = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (clients.length === 0) {
      return new Response(JSON.stringify({ error: 'Cliente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggiorna database
    await db.update(schema.clients)
      .set({
        subscriptionStatus: 'expired',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.clients.id, clientId));

    // Aggiorna KV con stato disabilitato
    const subscriptionKey = `client:${clientId}:subscription`;
    await env.SUBSCRIPTIONS.put(subscriptionKey, JSON.stringify({
      status: 'expired',
      reason: reason,
      disabledAt: new Date().toISOString(),
      disabledBy: 'admin',
    }), {
      expirationTtl: 86400 * 30, // 30 giorni
    });

    // Invalida tutte le sessioni del cliente
    // Nota: In produzione, usare un pattern più efficiente
    // Per ora, le sessioni scadranno naturalmente o verranno rifiutate dal middleware

    // Log azione
    await db.insert(schema.auditLog).values({
      clientId: clientId,
      action: 'SUBSCRIPTION_DISABLED',
      resourceType: 'subscription',
      resourceId: clientId,
      details: JSON.stringify({ reason }),
      createdAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Abbonamento cliente ${clientId} disabilitato`,
      reason: reason,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Disable subscription error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
