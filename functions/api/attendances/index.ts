/**
 * API Attendances - Gestione presenze
 * GET /api/attendances - Lista presenze
 * POST /api/attendances - Registra presenze (bulk)
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

// GET - Lista presenze
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
  const courseEditionId = url.searchParams.get('courseEditionId');
  const attendanceDate = url.searchParams.get('date');

  try {
    const db = drizzle(env.DB, { schema });

    const conditions = [eq(schema.attendances.clientId, auth.clientId)];

    if (courseEditionId) {
      conditions.push(eq(schema.attendances.courseEditionId, parseInt(courseEditionId)));
    }
    if (attendanceDate) {
      conditions.push(eq(schema.attendances.attendanceDate, attendanceDate));
    }

    const attendances = await db.select({
      id: schema.attendances.id,
      registrationId: schema.attendances.registrationId,
      studentId: schema.attendances.studentId,
      courseEditionId: schema.attendances.courseEditionId,
      attendanceDate: schema.attendances.attendanceDate,
      status: schema.attendances.status,
      notes: schema.attendances.notes,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
    })
    .from(schema.attendances)
    .innerJoin(schema.students, eq(schema.attendances.studentId, schema.students.id))
    .where(and(...conditions));

    return new Response(JSON.stringify(attendances), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List attendances error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Registra presenze (bulk per una giornata)
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
    const { courseEditionId, attendanceDate, attendances } = body;

    // Validazione
    if (!courseEditionId || !attendanceDate || !attendances || !Array.isArray(attendances)) {
      return new Response(JSON.stringify({ error: 'Edizione, data e lista presenze sono obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Verifica che l'edizione appartenga al cliente
    const edition = await db.select()
      .from(schema.courseEditions)
      .where(
        and(
          eq(schema.courseEditions.id, courseEditionId),
          eq(schema.courseEditions.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (edition.length === 0) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const results: any[] = [];

    for (const att of attendances) {
      const { registrationId, studentId, status, notes } = att;

      // Verifica che l'iscrizione esista
      const registration = await db.select()
        .from(schema.registrations)
        .where(
          and(
            eq(schema.registrations.id, registrationId),
            eq(schema.registrations.courseEditionId, courseEditionId)
          )
        )
        .limit(1);

      if (registration.length === 0) {
        continue;
      }

      // Cerca presenza esistente
      const existing = await db.select()
        .from(schema.attendances)
        .where(
          and(
            eq(schema.attendances.registrationId, registrationId),
            eq(schema.attendances.attendanceDate, attendanceDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Aggiorna
        await db.update(schema.attendances)
          .set({
            status: status || 'present',
            notes: notes || null,
            updatedAt: now,
          })
          .where(eq(schema.attendances.id, existing[0].id));
        
        results.push({ registrationId, action: 'updated', id: existing[0].id });
      } else {
        // Crea
        const result = await db.insert(schema.attendances).values({
          clientId: auth.clientId,
          registrationId,
          studentId,
          courseEditionId,
          attendanceDate,
          status: status || 'present',
          notes: notes || null,
          createdAt: now,
          updatedAt: now,
        }).returning({ id: schema.attendances.id });

        results.push({ registrationId, action: 'created', id: result[0].id });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Save attendances error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
