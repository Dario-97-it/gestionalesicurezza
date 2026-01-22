/**
 * API Courses - Gestione catalogo corsi
 * GET /api/courses - Lista corsi
 * POST /api/courses - Crea nuovo corso
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

// GET - Lista corsi
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
  const activeOnly = url.searchParams.get('activeOnly') === 'true';

  try {
    const db = drizzle(env.DB, { schema });

    const conditions = [eq(schema.courses.clientId, auth.clientId)];
    if (activeOnly) {
      conditions.push(eq(schema.courses.isActive, true));
    }

    const courses = await db.select()
      .from(schema.courses)
      .where(and(...conditions))
      .orderBy(asc(schema.courses.title));

    return new Response(JSON.stringify(courses), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List courses error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuovo corso
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
    const { title, code, type, durationHours, defaultPrice, description, certificateValidityMonths, isActive } = body;

    // Validazione
    if (!title || !code || !type || !durationHours || defaultPrice === undefined) {
      return new Response(JSON.stringify({ error: 'Titolo, codice, tipo, durata e prezzo sono obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Verifica codice unico per questo cliente
    const existing = await db.select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.clientId, auth.clientId),
          eq(schema.courses.code, code)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Codice corso già esistente' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Crea corso
    const now = new Date().toISOString();
    const result = await db.insert(schema.courses).values({
      clientId: auth.clientId,
      title,
      code,
      type,
      durationHours,
      defaultPrice,
      description: description || null,
      certificateValidityMonths: certificateValidityMonths || null,
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: schema.courses.id });

    return new Response(JSON.stringify({
      success: true,
      id: result[0].id,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create course error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
