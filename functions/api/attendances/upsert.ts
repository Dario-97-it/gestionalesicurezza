import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = context.data.auth as { userId: number; clientId: number } | undefined;
    
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = drizzle(context.env.DB, { schema });
    const body = await context.request.json() as {
      courseEditionId: number;
      studentId: number;
      registrationId: number;
      sessionId?: number;
      date?: string;
      present: boolean;
      hoursAttended?: number;
    };

    const { courseEditionId, studentId, registrationId, sessionId, date, present, hoursAttended } = body;

    if (!courseEditionId || !studentId) {
      return new Response(JSON.stringify({ error: 'Dati mancanti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Check if attendance already exists
    const whereConditions = [
      eq(schema.attendances.courseEditionId, courseEditionId),
      eq(schema.attendances.studentId, studentId),
      eq(schema.attendances.clientId, auth.clientId)
    ];
    if (attendanceDate) whereConditions.push(eq(schema.attendances.date, attendanceDate));
    if (sessionId) whereConditions.push(eq(schema.attendances.sessionId, sessionId));

    const existing = await db.select()
      .from(schema.attendances)
      .where(and(...whereConditions))
      .limit(1);

    let result;
    const status = present ? 'present' : 'absent';

    if (existing.length > 0) {
      // Update existing
      await db.update(schema.attendances)
        .set({ 
          status,
          hoursAttended: hoursAttended || 0,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.attendances.id, existing[0].id));
      
      result = { ...existing[0], status, hoursAttended: hoursAttended || 0 };
    } else {
      // Create new
      const insertResult = await db.insert(schema.attendances)
        .values({
          courseEditionId,
          studentId,
          registrationId,
          sessionId,
          date: attendanceDate,
          status,
          hoursAttended: hoursAttended || 0,
          clientId: auth.clientId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();
      
      result = insertResult[0];
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error upserting attendance:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
