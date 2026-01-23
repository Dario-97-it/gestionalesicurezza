/**
 * API per gestire una singola azienda
 * GET /api/companies/:id - Ottieni dettagli azienda
 * PUT /api/companies/:id - Aggiorna azienda
 * DELETE /api/companies/:id - Elimina azienda
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

// GET - Ottieni dettagli azienda
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const companyId = parseInt(params.id as string);
  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'ID azienda non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    const company = await db.select()
      .from(schema.companies)
      .where(and(
        eq(schema.companies.id, companyId),
        eq(schema.companies.clientId, auth.clientId)
      ))
      .limit(1);

    if (company.length === 0) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(company[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching company:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna azienda
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const companyId = parseInt(params.id as string);
  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'ID azienda non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });
    const body = await request.json() as any;

    // Verify company belongs to client
    const existing = await db.select()
      .from(schema.companies)
      .where(and(
        eq(schema.companies.id, companyId),
        eq(schema.companies.clientId, auth.clientId)
      ))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update company
    await db.update(schema.companies)
      .set({
        name: body.name,
        vatNumber: body.vatNumber || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        contactPerson: body.contactPerson || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.companies.id, companyId));

    // Fetch updated company
    const updated = await db.select()
      .from(schema.companies)
      .where(eq(schema.companies.id, companyId))
      .limit(1);

    return new Response(JSON.stringify(updated[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error updating company:', error);
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

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const companyId = parseInt(params.id as string);
  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'ID azienda non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verify company belongs to client
    const existing = await db.select()
      .from(schema.companies)
      .where(and(
        eq(schema.companies.id, companyId),
        eq(schema.companies.clientId, auth.clientId)
      ))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if company has students
    const studentsCount = await db.select()
      .from(schema.students)
      .where(eq(schema.students.companyId, companyId))
      .limit(1);

    if (studentsCount.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Impossibile eliminare l\'azienda: ci sono studenti associati' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete company
    await db.delete(schema.companies)
      .where(eq(schema.companies.id, companyId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error deleting company:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
