/**
 * API Admin Clients - Lista e gestione clienti
 * GET /api/admin/clients - Lista tutti i clienti
 * POST /api/admin/clients - Crea nuovo cliente
 * 
 * Richiede header X-Admin-Key
 */

import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, like, or, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
  SUBSCRIPTIONS: KVNamespace;
}

// GET - Lista tutti i clienti
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  try {
    const db = drizzle(env.DB, { schema });
    const offset = (page - 1) * limit;

    // Build query
    let query = db.select({
      id: schema.clients.id,
      email: schema.clients.email,
      name: schema.clients.name,
      contactPerson: schema.clients.contactPerson,
      phone: schema.clients.phone,
      plan: schema.clients.plan,
      subscriptionStatus: schema.clients.subscriptionStatus,
      subscriptionExpiresAt: schema.clients.subscriptionExpiresAt,
      maxUsers: schema.clients.maxUsers,
      createdAt: schema.clients.createdAt,
      lastLoginAt: schema.clients.lastLoginAt,
    })
    .from(schema.clients)
    .orderBy(desc(schema.clients.createdAt))
    .limit(limit)
    .offset(offset);

    // Apply filters
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(schema.clients.name, `%${search}%`),
          like(schema.clients.email, `%${search}%`)
        )
      );
    }
    if (status) {
      conditions.push(eq(schema.clients.subscriptionStatus, status as any));
    }

    const clients = conditions.length > 0 
      ? await query.where(conditions[0])
      : await query;

    // Count total
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.clients);
    const total = Number(countResult[0]?.count || 0);

    // Enrich with KV subscription data
    const enrichedClients = await Promise.all(clients.map(async (client) => {
      const subscriptionKey = `client:${client.id}:subscription`;
      const subscriptionData = await env.SUBSCRIPTIONS.get(subscriptionKey, 'json') as any;
      
      return {
        ...client,
        subscriptionKV: subscriptionData || null,
      };
    }));

    return new Response(JSON.stringify({
      data: enrichedClients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List clients error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuovo cliente
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as any;
    const { email, password, name, contactPerson, phone, plan, subscriptionExpiresAt, maxUsers } = body;

    // Validazione
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'Email, password e nome sono obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Verifica email unica
    const existing = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Email già registrata' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash password (semplificato - in produzione usare bcrypt)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Crea cliente
    const result = await db.insert(schema.clients).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      contactPerson: contactPerson || null,
      phone: phone || null,
      plan: plan || 'trial',
      subscriptionStatus: plan === 'trial' ? 'trial' : 'active',
      subscriptionExpiresAt: subscriptionExpiresAt || null,
      maxUsers: maxUsers || 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning({ id: schema.clients.id });

    const clientId = result[0].id;

    // Crea abbonamento in KV
    const subscriptionKey = `client:${clientId}:subscription`;
    await env.SUBSCRIPTIONS.put(subscriptionKey, JSON.stringify({
      status: plan === 'trial' ? 'trial' : 'active',
      plan: plan || 'trial',
      expiresAt: subscriptionExpiresAt || null,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    }), {
      expirationTtl: 86400 * 365,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Cliente creato con successo',
      client: {
        id: clientId,
        email: email.toLowerCase(),
        name,
        plan: plan || 'trial',
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create client error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
