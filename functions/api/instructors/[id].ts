/**
 * API Instructor by ID - Gestione singolo docente
 * GET /api/instructors/:id - Ottieni docente con storico corsi e statistiche
 * PUT /api/instructors/:id - Aggiorna docente
 * DELETE /api/instructors/:id - Elimina docente
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, inArray } from 'drizzle-orm';
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

// GET - Ottieni docente con storico corsi e statistiche
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;
  const instructorId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(instructorId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Recupera il docente
    const instructors = await db.select()
      .from(schema.instructors)
      .where(
        and(
          eq(schema.instructors.id, instructorId),
          eq(schema.instructors.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (instructors.length === 0) {
      return new Response(JSON.stringify({ error: 'Docente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Recupera le edizioni corsi insegnate da questo docente
    const editions = await db.select({
      id: schema.courseEditions.id,
      courseId: schema.courseEditions.courseId,
      courseName: schema.courses.title,
      durationHours: schema.courses.durationHours,
      startDate: schema.courseEditions.startDate,
      endDate: schema.courseEditions.endDate,
      location: schema.courseEditions.location,
      price: schema.courseEditions.price,
      status: schema.courseEditions.status,
    })
      .from(schema.courseEditions)
      .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
      .where(
        and(
          eq(schema.courseEditions.instructorId, instructorId),
          eq(schema.courseEditions.clientId, auth.clientId)
        )
      );

    // Per ogni edizione, recupera le registrazioni e le statistiche
    const courseHistory = [];
    for (const edition of editions) {
      const registrations = await db.select()
        .from(schema.registrations)
        .where(
          and(
            eq(schema.registrations.courseEditionId, edition.id),
            eq(schema.registrations.clientId, auth.clientId)
          )
        );

      // Raggruppa per azienda
      const byCompany: Record<number, { companyId: number; totalPrice: number; studentCount: number }> = {};
      for (const reg of registrations) {
        const companyId = reg.companyId || 0;
        if (!byCompany[companyId]) {
          byCompany[companyId] = { companyId, totalPrice: 0, studentCount: 0 };
        }
        byCompany[companyId].totalPrice += reg.priceApplied || 0;
        byCompany[companyId].studentCount += 1;
      }

      // Recupera i nomi delle aziende
      const companyIds = Object.keys(byCompany).map(Number).filter(id => id !== 0);
      const companies = companyIds.length > 0
        ? await db.select({ id: schema.companies.id, name: schema.companies.name })
            .from(schema.companies)
            .where(inArray(schema.companies.id, companyIds))
        : [];

      const companiesMap = Object.fromEntries(companies.map(c => [c.id, c.name]));

      courseHistory.push({
        editionId: edition.id,
        courseName: edition.courseName,
        durationHours: edition.durationHours,
        startDate: edition.startDate,
        endDate: edition.endDate,
        location: edition.location,
        price: edition.price,
        status: edition.status,
        totalStudents: registrations.length,
        byCompany: Object.values(byCompany).map(item => ({
          ...item,
          companyName: item.companyId === 0 ? 'Privato' : companiesMap[item.companyId] || 'Sconosciuto',
        })),
        totalRevenue: Object.values(byCompany).reduce((sum, item) => sum + item.totalPrice, 0),
      });
    }

    // Calcola statistiche totali
    const totalStudents = courseHistory.reduce((sum, course) => sum + course.totalStudents, 0);
    const totalRevenue = courseHistory.reduce((sum, course) => sum + course.totalRevenue, 0);
    const totalHours = courseHistory.reduce((sum, course) => sum + course.durationHours, 0);

    return new Response(JSON.stringify({
      ...instructors[0],
      courseHistory,
      statistics: {
        totalCourses: courseHistory.length,
        totalStudents,
        totalRevenue,
        totalHours,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get instructor error:', error);
    console.error('Get instructor error message:', error.message);
    console.error('Get instructor error stack:', error.stack);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna docente
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const auth = context.data.auth as AuthContext;
  const instructorId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(instructorId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const db = drizzle(env.DB, { schema });

    // Verifica che il docente esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.instructors)
      .where(
        and(
          eq(schema.instructors.id, instructorId),
          eq(schema.instructors.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Docente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggiorna
    await db.update(schema.instructors)
      .set({
        firstName: body.firstName ?? existing[0].firstName,
        lastName: body.lastName ?? existing[0].lastName,
        email: body.email !== undefined ? (body.email || null) : existing[0].email,
        phone: body.phone !== undefined ? (body.phone || null) : existing[0].phone,
        specialization: body.specialization !== undefined ? (body.specialization || null) : existing[0].specialization,
        hourlyRate: body.hourlyRate !== undefined ? (body.hourlyRate || null) : existing[0].hourlyRate,
        notes: body.notes !== undefined ? (body.notes || null) : existing[0].notes,
        bio: body.bio !== undefined ? (body.bio || null) : existing[0].bio,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.instructors.id, instructorId));

    // Ritorna il docente aggiornato
    const updated = await db.select()
      .from(schema.instructors)
      .where(eq(schema.instructors.id, instructorId))
      .limit(1);

    return new Response(JSON.stringify(updated[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update instructor error:', error);
    console.error('Update instructor error message:', error.message);
    console.error('Update instructor error stack:', error.stack);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina docente
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;
  const instructorId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isNaN(instructorId)) {
    return new Response(JSON.stringify({ error: 'ID non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che il docente esista e appartenga al cliente
    const existing = await db.select()
      .from(schema.instructors)
      .where(
        and(
          eq(schema.instructors.id, instructorId),
          eq(schema.instructors.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Docente non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Elimina
    await db.delete(schema.instructors)
      .where(eq(schema.instructors.id, instructorId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete instructor error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
