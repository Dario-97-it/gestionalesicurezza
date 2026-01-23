/**
 * API Courses - Gestione catalogo corsi
 * GET /api/courses - Lista corsi con paginazione
 * POST /api/courses - Crea nuovo corso
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, and, like, or, sql, count } from 'drizzle-orm';
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

// GET - Lista corsi con paginazione
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('activeOnly') === 'true';
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  try {
    const db = drizzle(env.DB, { schema });

    // Build conditions
    const conditions: any[] = [eq(schema.courses.clientId, auth.clientId)];
    
    if (activeOnly) {
      conditions.push(eq(schema.courses.isActive, true));
    }
    
    if (search) {
      conditions.push(
        or(
          like(schema.courses.title, `%${search}%`),
          like(schema.courses.code, `%${search}%`),
          like(schema.courses.type, `%${search}%`)
        )
      );
    }

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(schema.courses)
      .where(and(...conditions));
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const courses = await db.select()
      .from(schema.courses)
      .where(and(...conditions))
      .orderBy(asc(schema.courses.title))
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.ceil(total / pageSize);

    return new Response(JSON.stringify({
      data: courses,
      page,
      pageSize,
      total,
      totalPages,
    }), {
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
  const auth = context.data.auth as AuthContext;

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
    if (!title || !code) {
      return new Response(JSON.stringify({ error: 'Titolo e codice sono obbligatori' }), {
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
      type: type || 'base',
      durationHours: durationHours || 0,
      defaultPrice: defaultPrice || 0,
      description: description || null,
      certificateValidityMonths: certificateValidityMonths || null,
      isActive: isActive !== false && isActive !== 0,
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
