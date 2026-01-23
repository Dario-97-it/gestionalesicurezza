/**
 * API Company by ID - Gestione singola azienda
 * GET /api/companies/:id - Ottieni azienda
 * PUT /api/companies/:id - Aggiorna azienda
 * DELETE /api/companies/:id - Elimina azienda
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
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

// GET - Ottieni azienda
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;
  const companyId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    const companies = await db.select()
      .from(schema.companies)
      .where(
        and(
          eq(schema.companies.id, companyId),
          eq(schema.companies.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (companies.length === 0) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(companies[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get company error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna azienda
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const auth = context.data.auth as AuthContext;
  const companyId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const db = drizzle(env.DB, { schema });

    // Verifica che l'azienda esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.companies)
      .where(
        and(
          eq(schema.companies.id, companyId),
          eq(schema.companies.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica P.IVA unica se modificata
    if (body.vatNumber && body.vatNumber !== existing[0].vatNumber) {
      const duplicate = await db.select()
        .from(schema.companies)
        .where(
          and(
            eq(schema.companies.clientId, auth.clientId),
            eq(schema.companies.vatNumber, body.vatNumber)
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        return new Response(JSON.stringify({ error: 'P.IVA già registrata' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Aggiorna
    await db.update(schema.companies)
      .set({
        name: body.name ?? existing[0].name,
        vatNumber: body.vatNumber ?? existing[0].vatNumber,
        email: body.email ?? existing[0].email,
        phone: body.phone ?? existing[0].phone,
        address: body.address ?? existing[0].address,
        contactPerson: body.contactPerson ?? existing[0].contactPerson,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.companies.id, companyId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update company error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina azienda
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;
  const companyId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che l'azienda esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.companies)
      .where(
        and(
          eq(schema.companies.id, companyId),
          eq(schema.companies.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Elimina (cascade eliminerà anche studenti collegati)
    await db.delete(schema.companies)
      .where(eq(schema.companies.id, companyId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete company error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
