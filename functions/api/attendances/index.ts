/**
 * API Attendances - Gestione presenze
 * GET /api/attendances - Lista presenze con paginazione
 * POST /api/attendances - Registra presenze (bulk)
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count, desc } from 'drizzle-orm';
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

// GET - Lista presenze con paginazione
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
  const courseEditionId = url.searchParams.get('courseEditionId') || url.searchParams.get('editionId');
  const attendanceDate = url.searchParams.get('date');
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
  const offset = (page - 1) * pageSize;

  try {
    const db = drizzle(env.DB, { schema });

    const conditions: any[] = [eq(schema.attendances.clientId, auth.clientId)];

    if (courseEditionId) {
      conditions.push(eq(schema.attendances.courseEditionId, parseInt(courseEditionId)));
    }
    if (attendanceDate) {
      conditions.push(eq(schema.attendances.attendanceDate, attendanceDate));
    }

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(schema.attendances)
      .where(and(...conditions));
    const total = countResult[0]?.count || 0;

    const attendances = await db.select({
      id: schema.attendances.id,
      registrationId: schema.attendances.registrationId,
      studentId: schema.attendances.studentId,
      courseEditionId: schema.attendances.courseEditionId,
      attendanceDate: schema.attendances.attendanceDate,
      date: schema.attendances.attendanceDate,
      status: schema.attendances.status,
      present: schema.attendances.status,
      notes: schema.attendances.notes,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
    })
    .from(schema.attendances)
    .innerJoin(schema.students, eq(schema.attendances.studentId, schema.students.id))
    .where(and(...conditions))
    .orderBy(desc(schema.attendances.attendanceDate))
    .limit(pageSize)
    .offset(offset);

    // Map status to boolean present for frontend compatibility
    const mappedAttendances = attendances.map(a => ({
      ...a,
      present: a.status === 'present',
    }));

    const totalPages = Math.ceil(total / pageSize);

    return new Response(JSON.stringify({
      data: mappedAttendances,
      page,
      pageSize,
      total,
      totalPages,
    }), {
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
    
    // Support both bulk and single attendance
    const courseEditionId = body.courseEditionId;
    const attendanceDate = body.attendanceDate || body.date;
    const attendances = body.attendances || [body];

    // Validazione
    if (!courseEditionId || !attendanceDate) {
      return new Response(JSON.stringify({ error: 'Edizione e data sono obbligatori' }), {
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
      const registrationId = att.registrationId;
      const studentId = att.studentId;
      const status = att.status || (att.present ? 'present' : 'absent');
      const notes = att.notes;

      if (!registrationId && !studentId) continue;

      // Cerca presenza esistente
      let existing: any[] = [];
      if (registrationId) {
        existing = await db.select()
          .from(schema.attendances)
          .where(
            and(
              eq(schema.attendances.registrationId, registrationId),
              eq(schema.attendances.attendanceDate, attendanceDate)
            )
          )
          .limit(1);
      } else if (studentId) {
        existing = await db.select()
          .from(schema.attendances)
          .where(
            and(
              eq(schema.attendances.studentId, studentId),
              eq(schema.attendances.courseEditionId, courseEditionId),
              eq(schema.attendances.attendanceDate, attendanceDate)
            )
          )
          .limit(1);
      }

      if (existing.length > 0) {
        // Aggiorna
        await db.update(schema.attendances)
          .set({
            status,
            notes: notes || null,
            updatedAt: now,
          })
          .where(eq(schema.attendances.id, existing[0].id));
        
        results.push({ registrationId, studentId, action: 'updated', id: existing[0].id });
      } else {
        // Crea
        const result = await db.insert(schema.attendances).values({
          clientId: auth.clientId,
          registrationId: registrationId || null,
          studentId,
          courseEditionId,
          attendanceDate,
          status,
          notes: notes || null,
          createdAt: now,
          updatedAt: now,
        }).returning({ id: schema.attendances.id });

        results.push({ registrationId, studentId, action: 'created', id: result[0].id });
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
