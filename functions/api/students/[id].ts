/**
 * API Student by ID - Gestione singolo studente
 * GET /api/students/:id - Ottieni studente con dettagli
 * PUT /api/students/:id - Aggiorna studente
 * DELETE /api/students/:id - Elimina studente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc } from 'drizzle-orm';
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

// GET - Ottieni studente con dettagli (azienda, iscrizioni, presenze)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const studentId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(studentId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Ottieni studente
    const students = await db.select()
      .from(schema.students)
      .where(
        and(
          eq(schema.students.id, studentId),
          eq(schema.students.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (students.length === 0) {
      return new Response(JSON.stringify({ error: 'Studente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const student = students[0];

    // Ottieni azienda se presente
    let company = null;
    if (student.companyId) {
      const companies = await db.select()
        .from(schema.companies)
        .where(eq(schema.companies.id, student.companyId))
        .limit(1);
      company = companies[0] || null;
    }

    // Ottieni iscrizioni con dettagli corso
    const registrations = await db.select({
      id: schema.registrations.id,
      status: schema.registrations.status,
      priceApplied: schema.registrations.priceApplied,
      registrationDate: schema.registrations.registrationDate,
      courseEditionId: schema.registrations.courseEditionId,
      editionStartDate: schema.courseEditions.startDate,
      editionEndDate: schema.courseEditions.endDate,
      editionLocation: schema.courseEditions.location,
      editionStatus: schema.courseEditions.status,
      courseId: schema.courses.id,
      courseTitle: schema.courses.title,
      courseCode: schema.courses.code,
      courseType: schema.courses.type,
      courseDurationHours: schema.courses.durationHours,
    })
    .from(schema.registrations)
    .innerJoin(schema.courseEditions, eq(schema.registrations.courseEditionId, schema.courseEditions.id))
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .where(eq(schema.registrations.studentId, studentId))
    .orderBy(desc(schema.courseEditions.startDate));

    return new Response(JSON.stringify({
      ...student,
      company,
      registrations,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get student error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna studente
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const studentId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(studentId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const db = drizzle(env.DB, { schema });

    // Verifica che lo studente esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.students)
      .where(
        and(
          eq(schema.students.id, studentId),
          eq(schema.students.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Studente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica codice fiscale unico se modificato
    if (body.fiscalCode && body.fiscalCode.toUpperCase() !== existing[0].fiscalCode) {
      const duplicate = await db.select()
        .from(schema.students)
        .where(
          and(
            eq(schema.students.clientId, auth.clientId),
            eq(schema.students.fiscalCode, body.fiscalCode.toUpperCase())
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        return new Response(JSON.stringify({ error: 'Codice fiscale già registrato' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Aggiorna
    await db.update(schema.students)
      .set({
        firstName: body.firstName ?? existing[0].firstName,
        lastName: body.lastName ?? existing[0].lastName,
        fiscalCode: body.fiscalCode?.toUpperCase() ?? existing[0].fiscalCode,
        email: body.email ?? existing[0].email,
        phone: body.phone ?? existing[0].phone,
        birthDate: body.birthDate ?? existing[0].birthDate,
        birthPlace: body.birthPlace ?? existing[0].birthPlace,
        address: body.address ?? existing[0].address,
        companyId: body.companyId !== undefined ? body.companyId : existing[0].companyId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.students.id, studentId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update student error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina studente
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = (context as any).auth as AuthContext;
  const studentId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(studentId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che lo studente esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.students)
      .where(
        and(
          eq(schema.students.id, studentId),
          eq(schema.students.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Studente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Elimina (cascade eliminerà anche iscrizioni e presenze)
    await db.delete(schema.students)
      .where(eq(schema.students.id, studentId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete student error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
