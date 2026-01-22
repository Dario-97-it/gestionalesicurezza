/**
 * API Course by ID - Gestione singolo corso
 * GET /api/courses/:id - Ottieni corso
 * PUT /api/courses/:id - Aggiorna corso
 * DELETE /api/courses/:id - Elimina corso
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

// GET - Ottieni corso
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const courseId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(courseId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    const courses = await db.select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, courseId),
          eq(schema.courses.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (courses.length === 0) {
      return new Response(JSON.stringify({ error: 'Corso non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(courses[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get course error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna corso
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const courseId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(courseId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const db = drizzle(env.DB, { schema });

    // Verifica che il corso esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, courseId),
          eq(schema.courses.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Corso non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica codice unico se modificato
    if (body.code && body.code !== existing[0].code) {
      const duplicate = await db.select()
        .from(schema.courses)
        .where(
          and(
            eq(schema.courses.clientId, auth.clientId),
            eq(schema.courses.code, body.code)
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        return new Response(JSON.stringify({ error: 'Codice corso già esistente' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Aggiorna
    await db.update(schema.courses)
      .set({
        title: body.title ?? existing[0].title,
        code: body.code ?? existing[0].code,
        type: body.type ?? existing[0].type,
        durationHours: body.durationHours ?? existing[0].durationHours,
        defaultPrice: body.defaultPrice ?? existing[0].defaultPrice,
        description: body.description ?? existing[0].description,
        certificateValidityMonths: body.certificateValidityMonths ?? existing[0].certificateValidityMonths,
        isActive: body.isActive !== undefined ? body.isActive : existing[0].isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.courses.id, courseId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update course error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina corso
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const courseId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(courseId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che il corso esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, courseId),
          eq(schema.courses.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Corso non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Elimina (cascade eliminerà anche edizioni)
    await db.delete(schema.courses)
      .where(eq(schema.courses.id, courseId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete course error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
