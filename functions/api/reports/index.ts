/**
 * API Report e Statistiche
 * GET /api/reports - Ottieni dati report per anno
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, and, gte, lte, count, sum, desc } from 'drizzle-orm';
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

// GET - Dati report
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });
    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()));
    
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    // KPI Totali
    const [studentsCount] = await db.select({ count: count() })
      .from(schema.students)
      .where(eq(schema.students.clientId, auth.clientId));

    const [companiesCount] = await db.select({ count: count() })
      .from(schema.companies)
      .where(eq(schema.companies.clientId, auth.clientId));

    const [coursesCount] = await db.select({ count: count() })
      .from(schema.courses)
      .where(and(
        eq(schema.courses.clientId, auth.clientId),
        eq(schema.courses.isActive, true)
      ));

    // Edizioni dell'anno
    const [editionsCount] = await db.select({ count: count() })
      .from(schema.courseEditions)
      .where(and(
        eq(schema.courseEditions.clientId, auth.clientId),
        gte(schema.courseEditions.startDate, startOfYear),
        lte(schema.courseEditions.startDate, endOfYear)
      ));

    // Iscrizioni dell'anno
    const registrationsYear = await db.select({
      count: count(),
      totalRevenue: sum(schema.registrations.appliedPrice),
    })
    .from(schema.registrations)
    .innerJoin(schema.courseEditions, eq(schema.registrations.courseEditionId, schema.courseEditions.id))
    .where(and(
      eq(schema.registrations.clientId, auth.clientId),
      gte(schema.courseEditions.startDate, startOfYear),
      lte(schema.courseEditions.startDate, endOfYear)
    ));

    const totalRegistrations = registrationsYear[0]?.count || 0;
    const totalRevenue = Number(registrationsYear[0]?.totalRevenue) || 0;

    // Andamento mensile
    const monthlyData: Array<{ month: string; registrations: number; revenue: number; editions: number }> = [];
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    for (let month = 1; month <= 12; month++) {
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

      const monthRegs = await db.select({
        count: count(),
        revenue: sum(schema.registrations.appliedPrice),
      })
      .from(schema.registrations)
      .innerJoin(schema.courseEditions, eq(schema.registrations.courseEditionId, schema.courseEditions.id))
      .where(and(
        eq(schema.registrations.clientId, auth.clientId),
        gte(schema.courseEditions.startDate, monthStart),
        lte(schema.courseEditions.startDate, monthEnd)
      ));

      const [monthEditions] = await db.select({ count: count() })
        .from(schema.courseEditions)
        .where(and(
          eq(schema.courseEditions.clientId, auth.clientId),
          gte(schema.courseEditions.startDate, monthStart),
          lte(schema.courseEditions.startDate, monthEnd)
        ));

      monthlyData.push({
        month: monthNames[month - 1],
        registrations: monthRegs[0]?.count || 0,
        revenue: Number(monthRegs[0]?.revenue) || 0,
        editions: monthEditions?.count || 0,
      });
    }

    // Top 5 corsi per iscrizioni
    const topCourses = await db.select({
      id: schema.courses.id,
      title: schema.courses.title,
      registrations: count(schema.registrations.id),
      revenue: sum(schema.registrations.appliedPrice),
    })
    .from(schema.courses)
    .leftJoin(schema.courseEditions, eq(schema.courses.id, schema.courseEditions.courseId))
    .leftJoin(schema.registrations, eq(schema.courseEditions.id, schema.registrations.courseEditionId))
    .where(and(
      eq(schema.courses.clientId, auth.clientId),
      gte(schema.courseEditions.startDate, startOfYear),
      lte(schema.courseEditions.startDate, endOfYear)
    ))
    .groupBy(schema.courses.id, schema.courses.title)
    .orderBy(desc(count(schema.registrations.id)))
    .limit(5);

    // Top 5 aziende per fatturato
    const topCompanies = await db.select({
      id: schema.companies.id,
      name: schema.companies.name,
      students: count(sql`DISTINCT ${schema.students.id}`),
      registrations: count(schema.registrations.id),
      revenue: sum(schema.registrations.appliedPrice),
    })
    .from(schema.companies)
    .leftJoin(schema.students, eq(schema.companies.id, schema.students.companyId))
    .leftJoin(schema.registrations, eq(schema.students.id, schema.registrations.studentId))
    .leftJoin(schema.courseEditions, eq(schema.registrations.courseEditionId, schema.courseEditions.id))
    .where(and(
      eq(schema.companies.clientId, auth.clientId),
      gte(schema.courseEditions.startDate, startOfYear),
      lte(schema.courseEditions.startDate, endOfYear)
    ))
    .groupBy(schema.companies.id, schema.companies.name)
    .orderBy(desc(sum(schema.registrations.appliedPrice)))
    .limit(5);

    // Distribuzione corsi per tipo
    const coursesByType = await db.select({
      type: schema.courses.courseType,
      count: count(),
    })
    .from(schema.courses)
    .where(eq(schema.courses.clientId, auth.clientId))
    .groupBy(schema.courses.courseType);

    const totalCoursesForPercentage = coursesByType.reduce((sum, c) => sum + c.count, 0);
    const coursesByTypeWithPercentage = coursesByType.map(c => ({
      type: c.type || 'altro',
      count: c.count,
      percentage: totalCoursesForPercentage > 0 ? (c.count / totalCoursesForPercentage) * 100 : 0,
    }));

    // Performance docenti
    const instructorsPerformance = await db.select({
      id: schema.instructors.id,
      firstName: schema.instructors.firstName,
      lastName: schema.instructors.lastName,
      courses: count(sql`DISTINCT ${schema.courseEditions.id}`),
      hours: sum(schema.courses.durationHours),
      students: count(schema.registrations.id),
    })
    .from(schema.instructors)
    .leftJoin(schema.courseEditions, eq(schema.instructors.id, schema.courseEditions.instructorId))
    .leftJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .leftJoin(schema.registrations, eq(schema.courseEditions.id, schema.registrations.courseEditionId))
    .where(and(
      eq(schema.instructors.clientId, auth.clientId),
      gte(schema.courseEditions.startDate, startOfYear),
      lte(schema.courseEditions.startDate, endOfYear)
    ))
    .groupBy(schema.instructors.id, schema.instructors.firstName, schema.instructors.lastName)
    .orderBy(desc(count(sql`DISTINCT ${schema.courseEditions.id}`)))
    .limit(10);

    // Calcola medie
    const avgStudentsPerEdition = editionsCount.count > 0 
      ? totalRegistrations / editionsCount.count 
      : 0;
    const avgRevenuePerStudent = totalRegistrations > 0 
      ? totalRevenue / totalRegistrations 
      : 0;

    const reportData = {
      kpi: {
        totalStudents: studentsCount.count,
        totalCompanies: companiesCount.count,
        totalCourses: coursesCount.count,
        totalEditions: editionsCount.count,
        totalRegistrations,
        totalRevenue,
        avgStudentsPerEdition,
        avgRevenuePerStudent,
      },
      monthlyTrend: monthlyData,
      topCourses: topCourses.map(c => ({
        id: c.id,
        title: c.title,
        registrations: c.registrations,
        revenue: Number(c.revenue) || 0,
      })),
      topCompanies: topCompanies.map(c => ({
        id: c.id,
        name: c.name,
        students: c.students,
        registrations: c.registrations,
        revenue: Number(c.revenue) || 0,
      })),
      coursesByType: coursesByTypeWithPercentage,
      instructorsPerformance: instructorsPerformance.map(i => ({
        id: i.id,
        name: `${i.firstName} ${i.lastName}`,
        courses: i.courses,
        hours: Number(i.hours) || 0,
        students: i.students,
      })),
    };

    return new Response(JSON.stringify(reportData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Reports API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
