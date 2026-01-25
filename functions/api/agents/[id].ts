/**
 * API Agents - Operazioni su singolo agente
 * PUT /api/agents/:id - Modifica agente
 * DELETE /api/agents/:id - Elimina agente
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

// PUT - Modifica agente
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = context.data.auth as AuthContext;
  const agentId = parseInt(context.params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const { name, email, phone, notes } = body;

    // Validazione
    if (!name) {
      return new Response(JSON.stringify({ error: 'Nome agente obbligatorio' }), {
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
      return new Response(JSON.stringify({ error: 'Agente non trovato' }), {
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
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
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
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
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
      return new Response(JSON.stringify({ error: 'Agente non trovato' }), {
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
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
