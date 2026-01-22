/**
 * API Instructors - Gestione docenti
 * GET /api/instructors - Lista docenti
 * POST /api/instructors - Crea nuovo docente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, and } from 'drizzle-orm';
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

// GET - Lista docenti
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const auth = (context as any).auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    const instructors = await db.select()
      .from(schema.instructors)
      .where(eq(schema.instructors.clientId, auth.clientId))
      .orderBy(asc(schema.instructors.lastName), asc(schema.instructors.firstName));

    return new Response(JSON.stringify(instructors), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List instructors error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuovo docente
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
    const { firstName, lastName, email, phone, specialization, hourlyRate, notes } = body;

    // Validazione
    if (!firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'Nome e cognome obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Crea docente
    const now = new Date().toISOString();
    const result = await db.insert(schema.instructors).values({
      clientId: auth.clientId,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      specialization: specialization || null,
      hourlyRate: hourlyRate || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: schema.instructors.id });

    return new Response(JSON.stringify({
      success: true,
      id: result[0].id,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create instructor error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
