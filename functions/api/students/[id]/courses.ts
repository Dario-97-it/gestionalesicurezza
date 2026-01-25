/**
 * API per ottenere lo storico corsi di uno studente
 * GET /api/students/:id/courses
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

    // Verify student belongs to client
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

    // Get course history through registrations
    const registrations = await db.select({
      registrationId: schema.registrations.id,
      status: schema.registrations.status,
      editionId: schema.courseEditions.id,
      startDate: schema.courseEditions.startDate,
      endDate: schema.courseEditions.endDate,
      location: schema.courseEditions.location,
      editionStatus: schema.courseEditions.status,
      courseId: schema.courses.id,
      courseName: schema.courses.title,
      courseCode: schema.courses.code,
    })
    .from(schema.registrations)
    .innerJoin(schema.courseEditions, eq(schema.registrations.courseEditionId, schema.courseEditions.id))
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .where(eq(schema.registrations.studentId, studentId))
    .orderBy(schema.courseEditions.startDate);

    // For each registration, calculate attendance percentage
    const coursesWithAttendance = await Promise.all(registrations.map(async (reg) => {
      // Count total sessions and attended sessions
      const attendances = await db.select()
        .from(schema.attendances)
        .where(and(
          eq(schema.attendances.studentId, studentId),
          eq(schema.attendances.courseEditionId, reg.editionId)
        ));

      const totalSessions = attendances.length;
      const attendedSessions = attendances.filter(a => a.status === 'present').length;
      const attendancePercentage = totalSessions > 0 
        ? Math.round((attendedSessions / totalSessions) * 100) 
        : 0;

      // Map status
      let status = 'iscritto';
      if (reg.status === 'completed') status = 'completato';
      else if (reg.status === 'cancelled') status = 'annullato';
      else if (reg.editionStatus === 'in_progress') status = 'in_corso';

      return {
        id: reg.registrationId,
        courseName: reg.courseName,
        courseCode: reg.courseCode || '',
        editionDate: reg.startDate,
        location: reg.location || '',
        status,
        attendancePercentage,
        certificateIssued: reg.status === 'completed',
        certificateExpiry: null, // TODO: implement certificate expiry tracking
      };
    }));

    return new Response(JSON.stringify({ 
      courses: coursesWithAttendance,
      total: coursesWithAttendance.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching student courses:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
