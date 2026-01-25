/**
 * API Students - Gestione studenti
 * GET /api/students - Lista studenti con paginazione
 * POST /api/students - Crea nuovo studente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, like, or, asc, and, sql } from 'drizzle-orm';
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

// GET - Lista studenti con paginazione
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
  const companyId = url.searchParams.get('companyId');
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || url.searchParams.get('limit') || '20');
  const offset = (page - 1) * pageSize;

  try {
    const db = drizzle(env.DB, { schema });

    // Build conditions
    const conditions = [eq(schema.students.clientId, auth.clientId)];

    if (search) {
      conditions.push(
        or(
          like(schema.students.firstName, `%${search}%`),
          like(schema.students.lastName, `%${search}%`),
          like(schema.students.fiscalCode, `%${search}%`),
          like(schema.students.email, `%${search}%`)
        )!
      );
    }

    if (companyId) {
      conditions.push(eq(schema.students.companyId, parseInt(companyId)));
    }

    // Query studenti
    const students = await db.select()
      .from(schema.students)
      .where(and(...conditions))
      .orderBy(asc(schema.students.lastName), asc(schema.students.firstName))
      .limit(pageSize)
      .offset(offset);

    // Count totale
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.students)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);

    return new Response(JSON.stringify({
      data: students,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List students error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuovo studente
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
    const { firstName, lastName, fiscalCode, email, phone, birthDate, birthPlace, address, companyId } = body;

    // Validazione
    if (!firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'Nome e cognome obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Verifica codice fiscale unico per questo cliente
    if (fiscalCode) {
      const existing = await db.select()
        .from(schema.students)
        .where(
          and(
            eq(schema.students.clientId, auth.clientId),
            eq(schema.students.fiscalCode, fiscalCode.toUpperCase())
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return new Response(JSON.stringify({ 
          error: 'Codice fiscale già registrato',
          existingStudent: existing[0]
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Verifica che l'azienda appartenga al cliente
    if (companyId) {
      const company = await db.select()
        .from(schema.companies)
        .where(
          and(
            eq(schema.companies.id, companyId),
            eq(schema.companies.clientId, auth.clientId)
          )
        )
        .limit(1);

      if (company.length === 0) {
        return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Crea studente
    const now = new Date().toISOString();
    const result = await db.insert(schema.students).values({
      clientId: auth.clientId,
      firstName,
      lastName,
      fiscalCode: fiscalCode?.toUpperCase() || null,
      email: email || null,
      phone: phone || null,
      birthDate: birthDate || null,
      birthPlace: birthPlace || null,
      address: address || null,
      companyId: companyId || null,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: schema.students.id });

    return new Response(JSON.stringify({
      success: true,
      id: result[0].id,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create student error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
