import { drizzle } from 'drizzle-orm/d1';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

// GET /api/editions/:id/attendances - Ottieni presenze dell'edizione
// POST /api/editions/:id/attendances - Salva presenze per una sessione
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const db = drizzle(env.DB, { schema });
  const auth = context.data.auth as { clientId: number; userId: number } | undefined;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const editionId = parseInt(params.id as string);
  if (isNaN(editionId)) {
    return new Response(JSON.stringify({ error: 'ID edizione non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verifica che l'edizione appartenga al client
  const edition = await db.query.courseEditions.findFirst({
    where: and(
      eq(schema.courseEditions.id, editionId),
      eq(schema.courseEditions.clientId, auth.clientId)
    ),
  });

  if (!edition) {
    return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'GET') {
    try {
      // Recupera tutte le presenze dell'edizione
      const sessions = await db.query.editionSessions.findMany({
        where: eq(schema.editionSessions.editionId, editionId),
      });

      const sessionIds = sessions.map(s => s.id);
      
      if (sessionIds.length === 0) {
        return new Response(JSON.stringify({ attendances: [] }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const attendances = await db.query.sessionAttendances.findMany({
        where: inArray(schema.sessionAttendances.sessionId, sessionIds),
      });

      return new Response(JSON.stringify({ attendances }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching attendances:', error);
      return new Response(JSON.stringify({ error: 'Errore nel recupero delle presenze' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json() as { 
        attendances: Array<{
          studentId: number;
          sessionId: number;
          hoursAttended: number;
          isPresent: boolean;
          notes?: string;
        }> 
      };

      if (!body.attendances || !Array.isArray(body.attendances)) {
        return new Response(JSON.stringify({ error: 'Dati presenze non validi' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verifica che le sessioni appartengano all'edizione
      const sessionIds = [...new Set(body.attendances.map(a => a.sessionId))];
      const sessions = await db.query.editionSessions.findMany({
        where: and(
          eq(schema.editionSessions.editionId, editionId),
          inArray(schema.editionSessions.id, sessionIds)
        ),
      });

      if (sessions.length !== sessionIds.length) {
        return new Response(JSON.stringify({ error: 'Alcune sessioni non appartengono a questa edizione' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Upsert delle presenze
      for (const att of body.attendances) {
        // Cerca presenza esistente
        const existing = await db.query.sessionAttendances.findFirst({
          where: and(
            eq(schema.sessionAttendances.sessionId, att.sessionId),
            eq(schema.sessionAttendances.studentId, att.studentId)
          ),
        });

        if (existing) {
          // Aggiorna
          await db.update(schema.sessionAttendances)
            .set({
              hoursAttended: att.hoursAttended,
              isPresent: att.isPresent,
              notes: att.notes || null,
              updatedAt: new Date(),
            })
            .where(eq(schema.sessionAttendances.id, existing.id));
        } else {
          // Inserisci
          await db.insert(schema.sessionAttendances).values({
            sessionId: att.sessionId,
            studentId: att.studentId,
            hoursAttended: att.hoursAttended,
            isPresent: att.isPresent,
            notes: att.notes || null,
            clientId: auth.clientId,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Presenze salvate' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error saving attendances:', error);
      return new Response(JSON.stringify({ error: 'Errore nel salvataggio delle presenze' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Metodo non supportato' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
};
