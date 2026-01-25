/**
 * API per ottenere le statistiche di un'azienda
 * GET /api/companies/:id/stats
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count } from 'drizzle-orm';
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const companyId = parseInt(params.id as string);
  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'ID azienda non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verify company belongs to client
    const company = await db.select()
      .from(schema.companies)
      .where(and(
        eq(schema.companies.id, companyId),
        eq(schema.companies.clientId, auth.clientId)
      ))
      .limit(1);

    if (company.length === 0) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Count students
    const studentsResult = await db.select({ count: count() })
      .from(schema.students)
      .where(eq(schema.students.companyId, companyId));
    const totalStudents = studentsResult[0]?.count || 0;

    // Get all students of this company
    const companyStudents = await db.select({ id: schema.students.id })
      .from(schema.students)
      .where(eq(schema.students.companyId, companyId));
    
    const studentIds = companyStudents.map(s => s.id);

    let totalCourses = 0;
    let completedCourses = 0;

    if (studentIds.length > 0) {
      // Count registrations for company students
      for (const studentId of studentIds) {
        const registrations = await db.select({
          status: schema.registrations.status
        })
        .from(schema.registrations)
        .where(eq(schema.registrations.studentId, studentId));

        totalCourses += registrations.length;
        completedCourses += registrations.filter(r => r.status === 'completed').length;
      }
    }

    // For now, certificates are same as completed courses
    // TODO: Implement proper certificate tracking
    const activeCertificates = completedCourses;
    const expiringCertificates = 0; // TODO: Implement expiry tracking

    return new Response(JSON.stringify({
      totalStudents,
      totalCourses,
      completedCourses,
      activeCertificates,
      expiringCertificates
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching company stats:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
