/**
 * API Instructors - Gestione docenti
 * GET /api/instructors - Lista docenti con paginazione
 * POST /api/instructors - Crea nuovo docente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, and, like, or, count } from 'drizzle-orm';
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

// GET - Lista docenti con paginazione
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
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  try {
    const db = drizzle(env.DB, { schema });

    // Build conditions
    let whereCondition = eq(schema.instructors.clientId, auth.clientId);
    
    if (search) {
      whereCondition = and(
        eq(schema.instructors.clientId, auth.clientId),
        or(
          like(schema.instructors.firstName, `%${search}%`),
          like(schema.instructors.lastName, `%${search}%`),
          like(schema.instructors.email, `%${search}%`),
          like(schema.instructors.specialization, `%${search}%`)
        )
      )!;
    }

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(schema.instructors)
      .where(whereCondition);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const instructors = await db.select()
      .from(schema.instructors)
      .where(whereCondition)
      .orderBy(asc(schema.instructors.lastName), asc(schema.instructors.firstName))
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.ceil(total / pageSize);

    return new Response(JSON.stringify({
      data: instructors,
      page,
      pageSize,
      total,
      totalPages,
    }), {
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
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const { firstName, lastName, email, phone, specialization, hourlyRate, notes, bio, isActive } = body;

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
      bio: bio || null,
      isActive: isActive !== false && isActive !== 0,
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
