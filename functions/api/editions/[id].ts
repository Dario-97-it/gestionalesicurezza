/**
 * API Edition by ID - Gestione singola edizione
 * GET /api/editions/:id - Ottieni edizione con iscritti
 * PUT /api/editions/:id - Aggiorna edizione
 * DELETE /api/editions/:id - Elimina edizione
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

// GET - Ottieni edizione con iscritti
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const editionId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(editionId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Ottieni edizione con info corso
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
    .where(
      and(
        eq(schema.courseEditions.id, editionId),
        eq(schema.courseEditions.clientId, auth.clientId)
      )
    )
    .limit(1);

    if (editions.length === 0) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const edition = editions[0];

    // Ottieni iscritti
    const registrations = await db.select({
      id: schema.registrations.id,
      studentId: schema.registrations.studentId,
      status: schema.registrations.status,
      priceApplied: schema.registrations.priceApplied,
      registrationDate: schema.registrations.registrationDate,
      notes: schema.registrations.notes,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
      studentFiscalCode: schema.students.fiscalCode,
      studentEmail: schema.students.email,
      studentPhone: schema.students.phone,
    })
    .from(schema.registrations)
    .innerJoin(schema.students, eq(schema.registrations.studentId, schema.students.id))
    .where(eq(schema.registrations.courseEditionId, editionId));

    // Ottieni azienda dedicata se presente
    let dedicatedCompany = null;
    if (edition.dedicatedCompanyId) {
      const companies = await db.select()
        .from(schema.companies)
        .where(eq(schema.companies.id, edition.dedicatedCompanyId))
        .limit(1);
      dedicatedCompany = companies[0] || null;
    }

    // Ottieni docente se presente
    let instructorData = null;
    if (edition.instructorId) {
      const instructors = await db.select()
        .from(schema.instructors)
        .where(eq(schema.instructors.id, edition.instructorId))
        .limit(1);
      instructorData = instructors[0] || null;
    }

    return new Response(JSON.stringify({
      ...edition,
      registrations,
      dedicatedCompany,
      instructorData,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get edition error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna edizione
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const editionId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(editionId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const db = drizzle(env.DB, { schema });

    // Verifica che l'edizione esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.courseEditions)
      .where(
        and(
          eq(schema.courseEditions.id, editionId),
          eq(schema.courseEditions.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggiorna
    await db.update(schema.courseEditions)
      .set({
        startDate: body.startDate ?? existing[0].startDate,
        endDate: body.endDate ?? existing[0].endDate,
        location: body.location ?? existing[0].location,
        maxParticipants: body.maxParticipants ?? existing[0].maxParticipants,
        price: body.price ?? existing[0].price,
        customPrice: body.customPrice !== undefined ? body.customPrice : existing[0].customPrice,
        dedicatedCompanyId: body.dedicatedCompanyId !== undefined ? body.dedicatedCompanyId : existing[0].dedicatedCompanyId,
        instructorId: body.instructorId !== undefined ? body.instructorId : existing[0].instructorId,
        instructor: body.instructor !== undefined ? body.instructor : existing[0].instructor,
        status: body.status ?? existing[0].status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.courseEditions.id, editionId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update edition error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina edizione
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const editionId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(editionId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che l'edizione esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.courseEditions)
      .where(
        and(
          eq(schema.courseEditions.id, editionId),
          eq(schema.courseEditions.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Elimina (cascade eliminerà anche iscrizioni e presenze)
    await db.delete(schema.courseEditions)
      .where(eq(schema.courseEditions.id, editionId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete edition error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
