/**
 * API Agents - Gestione agenti commerciali
 * GET /api/agents - Lista agenti con statistiche studenti/aziende
 * POST /api/agents - Crea nuovo agente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, count, sql } from 'drizzle-orm';
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

// GET - Lista agenti con statistiche
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
  const offset = (page - 1) * pageSize;

  try {
    const db = drizzle(env.DB, { schema });

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(schema.agents)
      .where(eq(schema.agents.clientId, auth.clientId));
    const total = countResult[0]?.count || 0;

    // Get agents
    const agents = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.clientId, auth.clientId))
      .orderBy(desc(schema.agents.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Per ogni agente, conta studenti e aziende collegati
    const agentsWithStats = await Promise.all(agents.map(async (agent) => {
      // Conta studenti collegati a questo agente
      const studentsCount = await db.select({ count: count() })
        .from(schema.students)
        .where(eq(schema.students.agentId, agent.id));

      // Conta aziende collegate a questo agente
      const companiesCount = await db.select({ count: count() })
        .from(schema.companies)
        .where(eq(schema.companies.agentId, agent.id));

      return {
        ...agent,
        studentsCount: studentsCount[0]?.count || 0,
        companiesCount: companiesCount[0]?.count || 0,
      };
    }));

    const totalPages = Math.ceil(total / pageSize);

    return new Response(JSON.stringify({
      success: true,
      data: agentsWithStats,
      page,
      pageSize,
      total,
      totalPages,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List agents error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuovo agente
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = context.data.auth as AuthContext;

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

    const now = new Date().toISOString();
    const result = await db.insert(schema.agents).values({
      clientId: auth.clientId,
      name,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: schema.agents.id });

    return new Response(JSON.stringify({
      success: true,
      id: result[0].id,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create agent error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
