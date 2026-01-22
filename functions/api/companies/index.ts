/**
 * API Companies - Gestione aziende clienti
 * GET /api/companies - Lista aziende
 * POST /api/companies - Crea nuova azienda
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, like, or, asc, desc, and, sql } from 'drizzle-orm';
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

// GET - Lista aziende
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const auth = (context as any).auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';

  try {
    const db = drizzle(env.DB, { schema });

    let query = db.select()
      .from(schema.companies)
      .where(eq(schema.companies.clientId, auth.clientId))
      .orderBy(asc(schema.companies.name));

    if (search) {
      query = db.select()
        .from(schema.companies)
        .where(
          and(
            eq(schema.companies.clientId, auth.clientId),
            or(
              like(schema.companies.name, `%${search}%`),
              like(schema.companies.vatNumber, `%${search}%`)
            )
          )
        )
        .orderBy(asc(schema.companies.name));
    }

    const companies = await query;

    return new Response(JSON.stringify(companies), {
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
  const auth = (context as any).auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const { name, vatNumber, email, phone, address, contactPerson } = body;

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
