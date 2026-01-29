/**
 * API Instructor by ID - Gestione singolo docente
 * GET /api/instructors/:id - Ottieni docente
 * PUT /api/instructors/:id - Aggiorna docente
 * DELETE /api/instructors/:id - Elimina docente
 * 
 * Rebuild trigger: v2
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

// GET - Ottieni docente
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  console.log('GET /api/instructors/[id] - params:', params);
  console.log('GET /api/instructors/[id] - context.data:', context.data);
  const auth = context.data.auth as AuthContext;
  console.log('GET /api/instructors/[id] - auth:', auth);
  const instructorId = parseInt(params.id as string);
  console.log('GET /api/instructors/[id] - instructorId:', instructorId);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(instructorId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    const instructors = await db.select()
      .from(schema.instructors)
      .where(
        and(
          eq(schema.instructors.id, instructorId),
          eq(schema.instructors.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (instructors.length === 0) {
      return new Response(JSON.stringify({ error: 'Docente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(instructors[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get instructor error:', error);
    console.error('Get instructor error message:', error.message);
    console.error('Get instructor error stack:', error.stack);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna docente
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  console.log('PUT /api/instructors/[id] - params:', params);
  console.log('PUT /api/instructors/[id] - context.data:', context.data);
  const auth = context.data.auth as AuthContext;
  console.log('PUT /api/instructors/[id] - auth:', auth);
  const instructorId = parseInt(params.id as string);
  console.log('PUT /api/instructors/[id] - instructorId:', instructorId);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(instructorId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const db = drizzle(env.DB, { schema });

    // Verifica che il docente esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.instructors)
      .where(
        and(
          eq(schema.instructors.id, instructorId),
          eq(schema.instructors.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Docente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggiorna
    await db.update(schema.instructors)
      .set({
        firstName: body.firstName ?? existing[0].firstName,
        lastName: body.lastName ?? existing[0].lastName,
        email: body.email !== undefined ? (body.email || null) : existing[0].email,
        phone: body.phone !== undefined ? (body.phone || null) : existing[0].phone,
        specialization: body.specialization !== undefined ? (body.specialization || null) : existing[0].specialization,
        hourlyRate: body.hourlyRate !== undefined ? (body.hourlyRate || null) : existing[0].hourlyRate,
        notes: body.notes !== undefined ? (body.notes || null) : existing[0].notes,
        bio: body.bio !== undefined ? (body.bio || null) : existing[0].bio,
        isActive: body.isActive !== undefined ? body.isActive : existing[0].isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.instructors.id, instructorId));

    // Ritorna il docente aggiornato
    const updated = await db.select()
      .from(schema.instructors)
      .where(eq(schema.instructors.id, instructorId))
      .limit(1);

    return new Response(JSON.stringify(updated[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update instructor error:', error);
    console.error('Update instructor error message:', error.message);
    console.error('Update instructor error stack:', error.stack);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina docente
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;
  const instructorId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(instructorId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che il docente esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.instructors)
      .where(
        and(
          eq(schema.instructors.id, instructorId),
          eq(schema.instructors.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Docente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Elimina
    await db.delete(schema.instructors)
      .where(eq(schema.instructors.id, instructorId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete instructor error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
