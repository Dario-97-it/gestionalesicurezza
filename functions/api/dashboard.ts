/**
 * API Dashboard - Statistiche e riepiloghi completi
 * GET /api/dashboard - Ottieni statistiche dashboard con KPI reali
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, and, gte, lte, lt, desc, asc } from 'drizzle-orm';
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
  const auth = context.data.auth as AuthContext;

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
    const today = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    
    // Date per scadenze
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // ============================================
    // CONTEGGI BASE
    // ============================================
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

    // ============================================
    // STATISTICHE MENSILI
    // ============================================
    const [editionsThisMonth] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.courseEditions)
      .where(and(
        eq(schema.courseEditions.clientId, auth.clientId),
        gte(schema.courseEditions.startDate, startOfMonth),
        lte(schema.courseEditions.startDate, endOfMonth)
      ));

    const [registrationsThisMonth] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.registrations)
      .where(and(
        eq(schema.registrations.clientId, auth.clientId),
        gte(schema.registrations.registrationDate, startOfMonth),
        lte(schema.registrations.registrationDate, endOfMonth + 'T23:59:59')
      ));

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

    // ============================================
    // STATISTICHE ANNUALI
    // ============================================
    const [editionsThisYear] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.courseEditions)
      .where(and(
        eq(schema.courseEditions.clientId, auth.clientId),
        gte(schema.courseEditions.startDate, startOfYear),
        lte(schema.courseEditions.startDate, endOfYear)
      ));

    const [registrationsThisYear] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.registrations)
      .where(and(
        eq(schema.registrations.clientId, auth.clientId),
        gte(schema.registrations.registrationDate, startOfYear),
        lte(schema.registrations.registrationDate, endOfYear + 'T23:59:59')
      ));

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

    // ============================================
    // PROSSIME EDIZIONI (30 giorni)
    // ============================================
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
      gte(schema.courseEditions.startDate, today),
      lte(schema.courseEditions.startDate, thirtyDaysFromNow)
    ))
    .orderBy(asc(schema.courseEditions.startDate))
    .limit(10);

    // Aggiungi conteggio iscritti per ogni edizione
    const upcomingWithCount = await Promise.all(upcomingEditions.map(async (edition) => {
      const [count] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.registrations)
        .where(eq(schema.registrations.editionId, edition.id));
      
      return {
        ...edition,
        enrolledCount: Number(count?.count || 0),
      };
    }));

    // ============================================
    // EDIZIONI IN CORSO
    // ============================================
    const ongoingEditions = await db.select({
      id: schema.courseEditions.id,
      startDate: schema.courseEditions.startDate,
      endDate: schema.courseEditions.endDate,
      location: schema.courseEditions.location,
      courseTitle: schema.courses.title,
    })
    .from(schema.courseEditions)
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .where(and(
      eq(schema.courseEditions.clientId, auth.clientId),
      lte(schema.courseEditions.startDate, today),
      gte(schema.courseEditions.endDate, today)
    ))
    .limit(5);

    // ============================================
    // SCADENZE ATTESTATI (prossimi 90 giorni)
    // Calcola in base alla data di completamento + validità del corso
    // ============================================
    // Per ora, simuliamo con le registrazioni completate
    // In futuro, implementare una tabella certificates
    const completedRegistrations = await db.select({
      id: schema.registrations.id,
      studentId: schema.registrations.studentId,
      editionId: schema.registrations.editionId,
      status: schema.registrations.status,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
      courseTitle: schema.courses.title,
      courseValidityMonths: schema.courses.validityMonths,
      editionEndDate: schema.courseEditions.endDate,
      companyName: schema.companies.name,
    })
    .from(schema.registrations)
    .innerJoin(schema.students, eq(schema.registrations.studentId, schema.students.id))
    .innerJoin(schema.courseEditions, eq(schema.registrations.editionId, schema.courseEditions.id))
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .leftJoin(schema.companies, eq(schema.students.companyId, schema.companies.id))
    .where(and(
      eq(schema.registrations.clientId, auth.clientId),
      eq(schema.registrations.status, 'completed')
    ))
    .limit(100);

    // Calcola scadenze
    const expiringCertificates = completedRegistrations
      .map(reg => {
        if (!reg.editionEndDate || !reg.courseValidityMonths) return null;
        
        const endDate = new Date(reg.editionEndDate);
        const expiryDate = new Date(endDate);
        expiryDate.setMonth(expiryDate.getMonth() + reg.courseValidityMonths);
        
        const expiryStr = expiryDate.toISOString().split('T')[0];
        
        // Solo scadenze entro 90 giorni
        if (expiryStr < today || expiryStr > ninetyDaysFromNow) return null;
        
        return {
          id: reg.id,
          studentId: reg.studentId,
          studentName: `${reg.studentFirstName} ${reg.studentLastName}`,
          courseTitle: reg.courseTitle,
          companyName: reg.companyName || 'N/A',
          expiryDate: expiryStr,
          daysUntilExpiry: Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          urgency: expiryStr <= thirtyDaysFromNow ? 'high' : expiryStr <= sixtyDaysFromNow ? 'medium' : 'low'
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.daysUntilExpiry - b!.daysUntilExpiry);

    // Conteggi scadenze per urgenza
    const expiringCount = {
      total: expiringCertificates.length,
      high: expiringCertificates.filter(c => c!.urgency === 'high').length,
      medium: expiringCertificates.filter(c => c!.urgency === 'medium').length,
      low: expiringCertificates.filter(c => c!.urgency === 'low').length,
    };

    // ============================================
    // DATI PER GRAFICI - Iscrizioni per mese (ultimi 12 mesi)
    // ============================================
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = monthDate.toISOString().split('T')[0];
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const [monthRegistrations] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.registrations)
        .where(and(
          eq(schema.registrations.clientId, auth.clientId),
          gte(schema.registrations.registrationDate, monthStart),
          lte(schema.registrations.registrationDate, monthEnd + 'T23:59:59')
        ));

      const [monthRevenue] = await db.select({ 
        total: sql<number>`COALESCE(SUM(priceApplied), 0)` 
      })
        .from(schema.registrations)
        .where(and(
          eq(schema.registrations.clientId, auth.clientId),
          eq(schema.registrations.status, 'confirmed'),
          gte(schema.registrations.registrationDate, monthStart),
          lte(schema.registrations.registrationDate, monthEnd + 'T23:59:59')
        ));

      monthlyData.push({
        month: monthDate.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
        registrations: Number(monthRegistrations?.count || 0),
        revenue: Number(monthRevenue?.total || 0),
      });
    }

    // ============================================
    // DATI PER GRAFICI - Distribuzione corsi per tipo
    // ============================================
    const coursesByType = await db.select({
      type: schema.courses.type,
      count: sql<number>`count(*)`
    })
    .from(schema.courses)
    .where(eq(schema.courses.clientId, auth.clientId))
    .groupBy(schema.courses.type);

    // ============================================
    // ULTIME ISCRIZIONI
    // ============================================
    const recentRegistrations = await db.select({
      id: schema.registrations.id,
      registrationDate: schema.registrations.registrationDate,
      status: schema.registrations.status,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
      courseTitle: schema.courses.title,
      companyName: schema.companies.name,
    })
    .from(schema.registrations)
    .innerJoin(schema.students, eq(schema.registrations.studentId, schema.students.id))
    .innerJoin(schema.courseEditions, eq(schema.registrations.editionId, schema.courseEditions.id))
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .leftJoin(schema.companies, eq(schema.students.companyId, schema.companies.id))
    .where(eq(schema.registrations.clientId, auth.clientId))
    .orderBy(desc(schema.registrations.registrationDate))
    .limit(5);

    return new Response(JSON.stringify({
      // Conteggi base
      counts: {
        companies: Number(companiesCount?.count || 0),
        students: Number(studentsCount?.count || 0),
        courses: Number(coursesCount?.count || 0),
        instructors: Number(instructorsCount?.count || 0),
      },
      // Statistiche mensili
      thisMonth: {
        editions: Number(editionsThisMonth?.count || 0),
        registrations: Number(registrationsThisMonth?.count || 0),
        revenue: Number(revenueThisMonth?.total || 0),
      },
      // Statistiche annuali
      thisYear: {
        editions: Number(editionsThisYear?.count || 0),
        registrations: Number(registrationsThisYear?.count || 0),
        revenue: Number(revenueThisYear?.total || 0),
      },
      // Widget
      upcomingEditions: upcomingWithCount,
      ongoingEditions,
      recentRegistrations: recentRegistrations.map(r => ({
        ...r,
        studentName: `${r.studentFirstName} ${r.studentLastName}`,
      })),
      // Scadenze attestati
      expiringCertificates: expiringCertificates.slice(0, 10),
      expiringCount,
      // Dati per grafici
      charts: {
        monthlyData,
        coursesByType: coursesByType.map(c => ({
          type: c.type || 'altro',
          count: Number(c.count)
        })),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
