/**
 * API per gestire un singolo studente
 * GET /api/students/:id - Ottieni dettagli studente
 * PUT /api/students/:id - Aggiorna studente
 * DELETE /api/students/:id - Elimina studente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

// GET - Ottieni dettagli studente
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const studentId = parseInt(params.id as string);
  if (isNaN(studentId)) {
    return new Response(JSON.stringify({ error: 'ID studente non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    const student = await db.select()
      .from(schema.students)
      .where(and(
        eq(schema.students.id, studentId),
        eq(schema.students.clientId, auth.clientId)
      ))
      .limit(1);

    if (student.length === 0) {
      return new Response(JSON.stringify({ error: 'Studente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(student[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching student:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna studente
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const studentId = parseInt(params.id as string);
  if (isNaN(studentId)) {
    return new Response(JSON.stringify({ error: 'ID studente non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });
    const body = await request.json() as any;

    // Verify student belongs to client
    const existing = await db.select()
      .from(schema.students)
      .where(and(
        eq(schema.students.id, studentId),
        eq(schema.students.clientId, auth.clientId)
      ))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Studente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update student
    await db.update(schema.students)
      .set({
        firstName: body.firstName,
        lastName: body.lastName,
        fiscalCode: body.fiscalCode || null,
        email: body.email || null,
        phone: body.phone || null,
        birthDate: body.birthDate || null,
        birthPlace: body.birthPlace || null,
        address: body.address || null,
        companyId: body.companyId || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.students.id, studentId));

    // Fetch updated student
    const updated = await db.select()
      .from(schema.students)
      .where(eq(schema.students.id, studentId))
      .limit(1);

    return new Response(JSON.stringify(updated[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error updating student:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina studente
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const studentId = parseInt(params.id as string);
  if (isNaN(studentId)) {
    return new Response(JSON.stringify({ error: 'ID studente non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verify student belongs to client
    const existing = await db.select()
      .from(schema.students)
      .where(and(
        eq(schema.students.id, studentId),
        eq(schema.students.clientId, auth.clientId)
      ))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Studente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete student
    await db.delete(schema.students)
      .where(eq(schema.students.id, studentId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error deleting student:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
