/**
 * API Companies - Gestione aziende clienti
 * GET /api/companies - Lista aziende con paginazione
 * POST /api/companies - Crea nuova azienda
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, like, or, asc, desc, and, sql, count } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

// GET - Lista aziende con paginazione
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  // Leggi auth da context.data (impostato dal middleware)
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  try {
    const db = drizzle(env.DB, { schema });

    // Build where condition
    let whereCondition = eq(schema.companies.clientId, auth.clientId);
    
    if (search) {
      whereCondition = and(
        eq(schema.companies.clientId, auth.clientId),
        or(
          like(schema.companies.name, `%${search}%`),
          like(schema.companies.vatNumber, `%${search}%`),
          like(schema.companies.email, `%${search}%`)
        )
      )!;
    }

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(schema.companies)
      .where(whereCondition);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const companies = await db.select()
      .from(schema.companies)
      .where(whereCondition)
      .orderBy(asc(schema.companies.name))
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.ceil(total / pageSize);

    return new Response(JSON.stringify({
      data: companies,
      page,
      pageSize,
      total,
      totalPages,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List companies error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuova azienda
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  // Leggi auth da context.data (impostato dal middleware)
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const { name, vatNumber, email, phone, address, contactPerson, agentId } = body;

    // Validazione
    if (!name) {
      return new Response(JSON.stringify({ error: 'Ragione sociale obbligatoria' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Verifica P.IVA unica per questo cliente
    if (vatNumber) {
      const existing = await db.select()
        .from(schema.companies)
        .where(
          and(
            eq(schema.companies.clientId, auth.clientId),
            eq(schema.companies.vatNumber, vatNumber)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return new Response(JSON.stringify({ error: 'P.IVA già registrata' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Verifica che l'agente appartenga al cliente
    if (agentId) {
      const agent = await db.select()
        .from(schema.agents)
        .where(
          and(
            eq(schema.agents.id, agentId),
            eq(schema.agents.clientId, auth.clientId)
          )
        )
        .limit(1);

      if (agent.length === 0) {
        return new Response(JSON.stringify({ error: 'Agente non trovato' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Crea azienda
    const now = new Date().toISOString();
    const result = await db.insert(schema.companies).values({
      clientId: auth.clientId,
      name,
      vatNumber: vatNumber || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      contactPerson: contactPerson || null,
      agentId: agentId || null,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: schema.companies.id });

    return new Response(JSON.stringify({
      success: true,
      id: result[0].id,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create company error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
