/**
 * API Registrations - Gestione iscrizioni
 * GET /api/registrations - Lista iscrizioni
 * POST /api/registrations - Crea nuova iscrizione
 * POST /api/registrations/bulk - Iscrizione multipla
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
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

// GET - Lista iscrizioni
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
  const studentId = url.searchParams.get('studentId');
  const companyId = url.searchParams.get('companyId');

  try {
    const db = drizzle(env.DB, { schema });

    const conditions = [eq(schema.registrations.clientId, auth.clientId)];

    if (courseEditionId) {
      conditions.push(eq(schema.registrations.courseEditionId, parseInt(courseEditionId)));
    }
    if (studentId) {
      conditions.push(eq(schema.registrations.studentId, parseInt(studentId)));
    }
    if (companyId) {
      conditions.push(eq(schema.registrations.companyId, parseInt(companyId)));
    }

    const registrations = await db.select({
      id: schema.registrations.id,
      studentId: schema.registrations.studentId,
      courseEditionId: schema.registrations.courseEditionId,
      companyId: schema.registrations.companyId,
      status: schema.registrations.status,
      priceApplied: schema.registrations.priceApplied,
      registrationDate: schema.registrations.registrationDate,
      notes: schema.registrations.notes,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
      studentFiscalCode: schema.students.fiscalCode,
    })
    .from(schema.registrations)
    .innerJoin(schema.students, eq(schema.registrations.studentId, schema.students.id))
    .where(and(...conditions));

    return new Response(JSON.stringify(registrations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('List registrations error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Crea nuova iscrizione (singola o multipla)
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
    const db = drizzle(env.DB, { schema });

    // Supporta sia singola iscrizione che bulk
    const studentIds = body.studentIds || [body.studentId];
    const { courseEditionId, priceApplied, notes } = body;

    // Validazione
    if (!studentIds.length || !courseEditionId || priceApplied === undefined) {
      return new Response(JSON.stringify({ error: 'Studente, edizione e prezzo sono obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    // Verifica capienza
    const currentCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.courseEditionId, courseEditionId),
          eq(schema.registrations.status, 'confirmed')
        )
      );
    
    const enrolled = Number(currentCount[0]?.count || 0);
    if (enrolled + studentIds.length > edition[0].maxParticipants) {
      return new Response(JSON.stringify({ 
        error: 'Capienza massima superata',
        available: edition[0].maxParticipants - enrolled,
        requested: studentIds.length
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const results: any[] = [];
    const errors: any[] = [];

    for (const studentId of studentIds) {
      // Verifica che lo studente appartenga al cliente
      const student = await db.select()
        .from(schema.students)
        .where(
          and(
            eq(schema.students.id, studentId),
            eq(schema.students.clientId, auth.clientId)
          )
        )
        .limit(1);

      if (student.length === 0) {
        errors.push({ studentId, error: 'Studente non trovato' });
        continue;
      }

      // Verifica che non sia già iscritto
      const existing = await db.select()
        .from(schema.registrations)
        .where(
          and(
            eq(schema.registrations.studentId, studentId),
            eq(schema.registrations.courseEditionId, courseEditionId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        errors.push({ studentId, error: 'Studente già iscritto' });
        continue;
      }

      // Crea iscrizione
      const result = await db.insert(schema.registrations).values({
        clientId: auth.clientId,
        studentId,
        courseEditionId,
        companyId: student[0].companyId,
        priceApplied,
        notes: notes || null,
        status: 'confirmed',
        registrationDate: now,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: schema.registrations.id });

      results.push({ studentId, registrationId: result[0].id });
    }

    return new Response(JSON.stringify({
      success: true,
      created: results,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Create registration error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
