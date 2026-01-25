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
      editionId: number;
      sessionId?: number;
      date?: string;
      present: boolean;
      hoursAttended?: number;
    };

    const { editionId, sessionId, date, present, hoursAttended } = body;

    if (!editionId) {
      return new Response(JSON.stringify({ error: 'Dati mancanti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    const status = present ? 'present' : 'absent';

    // Get all registrations for this edition
    const registrations = await db.select()
      .from(schema.registrations)
      .where(and(
        eq(schema.registrations.courseEditionId, editionId),
        eq(schema.registrations.clientId, auth.clientId)
      ));

    // For each registration, upsert attendance
    for (const reg of registrations) {
      // Check if attendance exists
      const existing = await db.select()
        .from(schema.attendances)
        .where(and(
          eq(schema.attendances.courseEditionId, editionId),
          eq(schema.attendances.studentId, reg.studentId!),
          eq(schema.attendances.date, date),
          eq(schema.attendances.clientId, auth.clientId)
        ))
        .limit(1);

      const whereConditions = [
        eq(schema.attendances.courseEditionId, editionId),
        eq(schema.attendances.studentId, reg.studentId!),
        eq(schema.attendances.clientId, auth.clientId)
      ];
      if (attendanceDate) whereConditions.push(eq(schema.attendances.date, attendanceDate));
      if (sessionId) whereConditions.push(eq(schema.attendances.sessionId, sessionId));

      if (existing.length > 0) {
        // Update
        await db.update(schema.attendances)
          .set({ 
            status,
            hoursAttended: hoursAttended || 0,
            updatedAt: new Date().toISOString()
          })
          .where(eq(schema.attendances.id, existing[0].id));
      } else {
        // Insert
        await db.insert(schema.attendances)
          .values({
            courseEditionId: editionId,
            studentId: reg.studentId!,
            registrationId: reg.id,
            sessionId,
            date: attendanceDate,
            status,
            hoursAttended: hoursAttended || 0,
            clientId: auth.clientId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${registrations.length} presenze aggiornate` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error marking all attendances:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
