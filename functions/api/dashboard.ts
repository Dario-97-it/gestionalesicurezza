/**
 * API Dashboard - Statistiche e riepiloghi
 * GET /api/dashboard - Ottieni statistiche dashboard
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

// GET - Statistiche dashboard
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const auth = (context as any).auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Date per filtri
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];

    // Conteggi base
    const [companiesCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.companies)
      .where(eq(schema.companies.clientId, auth.clientId));

    const [studentsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.students)
      .where(eq(schema.students.clientId, auth.clientId));

    const [coursesCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.courses)
      .where(and(
        eq(schema.courses.clientId, auth.clientId),
        eq(schema.courses.isActive, true)
      ));

    const [instructorsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.instructors)
      .where(eq(schema.instructors.clientId, auth.clientId));

    // Edizioni questo mese
    const [editionsThisMonth] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.courseEditions)
      .where(and(
        eq(schema.courseEditions.clientId, auth.clientId),
        gte(schema.courseEditions.startDate, startOfMonth),
        lte(schema.courseEditions.startDate, endOfMonth)
      ));

    // Edizioni quest'anno
    const [editionsThisYear] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.courseEditions)
      .where(and(
        eq(schema.courseEditions.clientId, auth.clientId),
        gte(schema.courseEditions.startDate, startOfYear),
        lte(schema.courseEditions.startDate, endOfYear)
      ));

    // Iscrizioni questo mese
    const [registrationsThisMonth] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.registrations)
      .where(and(
        eq(schema.registrations.clientId, auth.clientId),
        gte(schema.registrations.registrationDate, startOfMonth),
        lte(schema.registrations.registrationDate, endOfMonth + 'T23:59:59')
      ));

    // Iscrizioni quest'anno
    const [registrationsThisYear] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.registrations)
      .where(and(
        eq(schema.registrations.clientId, auth.clientId),
        gte(schema.registrations.registrationDate, startOfYear),
        lte(schema.registrations.registrationDate, endOfYear + 'T23:59:59')
      ));

    // Fatturato questo mese
    const [revenueThisMonth] = await db.select({ 
      total: sql<number>`COALESCE(SUM(priceApplied), 0)` 
    })
      .from(schema.registrations)
      .where(and(
        eq(schema.registrations.clientId, auth.clientId),
        eq(schema.registrations.status, 'confirmed'),
        gte(schema.registrations.registrationDate, startOfMonth),
        lte(schema.registrations.registrationDate, endOfMonth + 'T23:59:59')
      ));

    // Fatturato quest'anno
    const [revenueThisYear] = await db.select({ 
      total: sql<number>`COALESCE(SUM(priceApplied), 0)` 
    })
      .from(schema.registrations)
      .where(and(
        eq(schema.registrations.clientId, auth.clientId),
        eq(schema.registrations.status, 'confirmed'),
        gte(schema.registrations.registrationDate, startOfYear),
        lte(schema.registrations.registrationDate, endOfYear + 'T23:59:59')
      ));

    // Prossime edizioni (prossimi 30 giorni)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const upcomingEditions = await db.select({
      id: schema.courseEditions.id,
      startDate: schema.courseEditions.startDate,
      endDate: schema.courseEditions.endDate,
      location: schema.courseEditions.location,
      status: schema.courseEditions.status,
      maxParticipants: schema.courseEditions.maxParticipants,
      courseTitle: schema.courses.title,
      courseCode: schema.courses.code,
    })
    .from(schema.courseEditions)
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .where(and(
      eq(schema.courseEditions.clientId, auth.clientId),
      gte(schema.courseEditions.startDate, now.toISOString().split('T')[0]),
      lte(schema.courseEditions.startDate, thirtyDaysFromNow),
      eq(schema.courseEditions.status, 'scheduled')
    ))
    .limit(10);

    // Aggiungi conteggio iscritti per ogni edizione
    const upcomingWithCount = await Promise.all(upcomingEditions.map(async (edition) => {
      const [count] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.registrations)
        .where(and(
          eq(schema.registrations.courseEditionId, edition.id),
          eq(schema.registrations.status, 'confirmed')
        ));
      
      return {
        ...edition,
        enrolledCount: Number(count?.count || 0),
      };
    }));

    return new Response(JSON.stringify({
      counts: {
        companies: Number(companiesCount?.count || 0),
        students: Number(studentsCount?.count || 0),
        courses: Number(coursesCount?.count || 0),
        instructors: Number(instructorsCount?.count || 0),
      },
      thisMonth: {
        editions: Number(editionsThisMonth?.count || 0),
        registrations: Number(registrationsThisMonth?.count || 0),
        revenue: Number(revenueThisMonth?.total || 0),
      },
      thisYear: {
        editions: Number(editionsThisYear?.count || 0),
        registrations: Number(registrationsThisYear?.count || 0),
        revenue: Number(revenueThisYear?.total || 0),
      },
      upcomingEditions: upcomingWithCount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
