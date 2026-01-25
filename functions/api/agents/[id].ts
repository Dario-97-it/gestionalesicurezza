/**
 * API Agent Detail - Dettaglio singolo agente
 * GET /api/agents/:id - Dettaglio agente con studenti e aziende collegati
 * PUT /api/agents/:id - Modifica agente
 * DELETE /api/agents/:id - Elimina agente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

// GET - Dettaglio agente con studenti e aziende
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const agentId = parseInt(params.id as string);
  if (isNaN(agentId)) {
    return new Response(JSON.stringify({ success: false, error: 'ID agente non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Get agent
    const agents = await db.select()
      .from(schema.agents)
      .where(and(
        eq(schema.agents.id, agentId),
        eq(schema.agents.clientId, auth.clientId)
      ));

    if (agents.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Agente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const agent = agents[0];

    // Get students linked to this agent
    const students = await db.select({
      id: schema.students.id,
      firstName: schema.students.firstName,
      lastName: schema.students.lastName,
      fiscalCode: schema.students.fiscalCode,
      email: schema.students.email,
      phone: schema.students.phone,
      companyId: schema.students.companyId,
      createdAt: schema.students.createdAt,
    })
      .from(schema.students)
      .where(and(
        eq(schema.students.agentId, agentId),
        eq(schema.students.clientId, auth.clientId)
      ));

    // Get companies linked to this agent
    const companies = await db.select({
      id: schema.companies.id,
      name: schema.companies.name,
      vatNumber: schema.companies.vatNumber,
      email: schema.companies.email,
      phone: schema.companies.phone,
      city: schema.companies.city,
      createdAt: schema.companies.createdAt,
    })
      .from(schema.companies)
      .where(and(
        eq(schema.companies.agentId, agentId),
        eq(schema.companies.clientId, auth.clientId)
      ));

    // Enrich students with company name
    const studentsWithCompany = await Promise.all(students.map(async (student) => {
      let companyName = null;
      if (student.companyId) {
        const company = await db.select({ name: schema.companies.name })
          .from(schema.companies)
          .where(eq(schema.companies.id, student.companyId));
        companyName = company[0]?.name || null;
      }
      return {
        ...student,
        companyName,
      };
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...agent,
        students: studentsWithCompany,
        companies: companies,
        studentsCount: students.length,
        companiesCount: companies.length,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get agent detail error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Modifica agente
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = context.data.auth as AuthContext;
  const agentId = parseInt(context.params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const { name, email, phone, notes } = body;

    // Validazione
    if (!name) {
      return new Response(JSON.stringify({ success: false, error: 'Nome agente obbligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    const result = await db.update(schema.agents)
      .set({
        name,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.agents.id, agentId),
          eq(schema.agents.clientId, auth.clientId)
        )
      )
      .returning();

    if (result.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Agente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result[0],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update agent error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina agente
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const auth = context.data.auth as AuthContext;
  const agentId = parseInt(context.params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che l'agente esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.id, agentId),
          eq(schema.agents.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Agente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.delete(schema.agents)
      .where(
        and(
          eq(schema.agents.id, agentId),
          eq(schema.agents.clientId, auth.clientId)
        )
      );

    return new Response(JSON.stringify({
      success: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete agent error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
