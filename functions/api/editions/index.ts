/**
 * API Course Editions - Gestione edizioni corsi
 * GET /api/editions - Lista edizioni con filtri e paginazione
 * POST /api/editions - Crea nuova edizione
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
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

// GET - Lista edizioni con filtri e paginazione
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
  const courseId = url.searchParams.get('courseId');
  const status = url.searchParams.get('status');
  const startDateFrom = url.searchParams.get('startDateFrom');
  const startDateTo = url.searchParams.get('startDateTo');
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  try {
    const db = drizzle(env.DB, { schema });

    // Build conditions
    const conditions: any[] = [eq(schema.courseEditions.clientId, auth.clientId)];

    if (courseId) {
      conditions.push(eq(schema.courseEditions.courseId, parseInt(courseId)));
    }
    if (status) {
      conditions.push(eq(schema.courseEditions.status, status as any));
    }
    if (startDateFrom) {
      conditions.push(gte(schema.courseEditions.startDate, startDateFrom));
    }
    if (startDateTo) {
      conditions.push(lte(schema.courseEditions.startDate, startDateTo));
    }

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(schema.courseEditions)
      .where(and(...conditions));
    const total = countResult[0]?.count || 0;

    // Query con join per ottenere info corso
    const editions = await db.select({
      id: schema.courseEditions.id,
      courseId: schema.courseEditions.courseId,
      startDate: schema.courseEditions.startDate,
      endDate: schema.courseEditions.endDate,
      location: schema.courseEditions.location,
      instructorId: schema.courseEditions.instructorId,
      maxParticipants: schema.courseEditions.maxParticipants,
      price: schema.courseEditions.price,
      customPrice: schema.courseEditions.customPrice,
      dedicatedCompanyId: schema.courseEditions.dedicatedCompanyId,
      instructor: schema.courseEditions.instructor,
      status: schema.courseEditions.status,
      createdAt: schema.courseEditions.createdAt,
      courseTitle: schema.courses.title,
      courseCode: schema.courses.code,
      courseType: schema.courses.type,
      courseDurationHours: schema.courses.durationHours,
    })
    .from(schema.courseEditions)
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .where(and(...conditions))
    .orderBy(desc(schema.courseEditions.startDate))
    .limit(pageSize)
    .offset(offset);

    // Conta iscritti per ogni edizione
    const editionsWithCount = await Promise.all(editions.map(async (edition) => {
      const enrolledResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.registrations)
        .where(
          and(
            eq(schema.registrations.courseEditionId, edition.id),
            eq(schema.registrations.status, 'confirmed')
          )
        );
      
      return {
        ...edition,
        enrolledCount: Number(enrolledResult[0]?.count || 0),
      };
    }));

    const totalPages = Math.ceil(total / pageSize);

    return new Response(JSON.stringify({
      data: editionsWithCount,
      page,
      pageSize,
      total,
      totalPages,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List editions error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuova edizione
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
    const { 
      courseId, startDate, endDate, location, maxParticipants, price, 
      customPrice, dedicatedCompanyId, instructorId, instructor, status
    } = body;

    // Validazione
    if (!courseId || !startDate) {
      return new Response(JSON.stringify({ error: 'Corso e data inizio sono obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Verifica che il corso appartenga al cliente
    const course = await db.select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, courseId),
          eq(schema.courses.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (course.length === 0) {
      return new Response(JSON.stringify({ error: 'Corso non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica azienda dedicata se presente
    if (dedicatedCompanyId) {
      const company = await db.select()
        .from(schema.companies)
        .where(
          and(
            eq(schema.companies.id, dedicatedCompanyId),
            eq(schema.companies.clientId, auth.clientId)
          )
        )
        .limit(1);

      if (company.length === 0) {
        return new Response(JSON.stringify({ error: 'Azienda dedicata non trovata' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Crea edizione - endDate e location sono obbligatori nello schema
    const now = new Date().toISOString();
    const result = await db.insert(schema.courseEditions).values({
      clientId: auth.clientId,
      courseId,
      startDate,
      endDate: endDate || startDate, // Se non specificato, usa la stessa data di inizio
      location: location || 'Da definire', // Valore di default se non specificato
      maxParticipants: maxParticipants || 20,
      price: price || course[0].defaultPrice || 0,
      customPrice: customPrice || null,
      dedicatedCompanyId: dedicatedCompanyId || null,
      instructorId: instructorId || null,
      instructor: instructor || null,
      status: status || 'scheduled',
      createdAt: now,
      updatedAt: now,
    }).returning({ id: schema.courseEditions.id });

    return new Response(JSON.stringify({
      success: true,
      id: result[0].id,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create edition error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
