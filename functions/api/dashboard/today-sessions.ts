/**
 * API Endpoint: Today's Sessions
 * GET /api/dashboard/today-sessions
 * 
 * Returns all course sessions scheduled for today.
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const auth = context.data.auth as AuthContext;
  
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const db = drizzle(env.DB, { schema });
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Query usando Drizzle ORM
    const sessions = await db.select({
      id: schema.editionSessions.id,
      sessionDate: schema.editionSessions.sessionDate,
      startTime: schema.editionSessions.startTime,
      endTime: schema.editionSessions.endTime,
      hours: schema.editionSessions.hours,
      location: schema.editionSessions.location,
      editionId: schema.courseEditions.id,
      courseTitle: schema.courses.title,
      courseCode: schema.courses.code,
      instructorFirstName: schema.instructors.firstName,
      instructorLastName: schema.instructors.lastName,
    })
    .from(schema.editionSessions)
    .innerJoin(schema.courseEditions, eq(schema.courseEditions.id, schema.editionSessions.editionId))
    .innerJoin(schema.courses, eq(schema.courses.id, schema.courseEditions.courseId))
    .leftJoin(schema.instructors, eq(schema.instructors.id, schema.courseEditions.instructorId))
    .where(
      and(
        eq(schema.editionSessions.sessionDate, today),
        eq(schema.courseEditions.clientId, auth.clientId)
      )
    )
    .orderBy(schema.editionSessions.startTime);
    
    return new Response(JSON.stringify({ 
      sessions: sessions || [],
      date: today
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error fetching today sessions:', error);
    console.error('Error message:', error.message);
    return new Response(JSON.stringify({ 
      error: 'Errore nel recupero delle sessioni di oggi',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
