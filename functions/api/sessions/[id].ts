import { drizzle } from 'drizzle-orm/d1';
import { eq, and, asc } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

// GET /api/sessions/:id - Dettaglio sessione
// PUT /api/sessions/:id - Modifica sessione
// DELETE /api/sessions/:id - Elimina sessione
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

  const sessionId = parseInt(params.id as string);
  if (isNaN(sessionId)) {
    return new Response(JSON.stringify({ error: 'ID sessione non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verifica che la sessione appartenga al client
  const session = await db.query.editionSessions.findFirst({
    where: and(
      eq(schema.editionSessions.id, sessionId),
      eq(schema.editionSessions.clientId, auth.clientId)
    ),
  });

  if (!session) {
    return new Response(JSON.stringify({ error: 'Sessione non trovata' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'GET') {
    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'PUT') {
    try {
      const body = await request.json() as {
        sessionDate?: string;
        startTime?: string;
        endTime?: string;
        hours?: number;
        location?: string;
        notes?: string;
      };

      const [updatedSession] = await db.update(schema.editionSessions)
        .set({
          ...body,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.editionSessions.id, sessionId))
        .returning();

      // Aggiorna le date dell'edizione
      const allSessions = await db.query.editionSessions.findMany({
        where: eq(schema.editionSessions.editionId, session.editionId),
        orderBy: [asc(schema.editionSessions.sessionDate)],
      });

      if (allSessions.length > 0) {
        const startDate = allSessions[0].sessionDate;
        const endDate = allSessions[allSessions.length - 1].sessionDate;
        
        await db.update(schema.courseEditions)
          .set({ startDate, endDate, updatedAt: new Date().toISOString() })
          .where(eq(schema.courseEditions.id, session.editionId));
      }

      return new Response(JSON.stringify(updatedSession), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating session:', error);
      return new Response(JSON.stringify({ error: 'Errore nella modifica della sessione' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'DELETE') {
    try {
      await db.delete(schema.editionSessions)
        .where(eq(schema.editionSessions.id, sessionId));

      // Aggiorna le date dell'edizione
      const allSessions = await db.query.editionSessions.findMany({
        where: eq(schema.editionSessions.editionId, session.editionId),
        orderBy: [asc(schema.editionSessions.sessionDate)],
      });

      if (allSessions.length > 0) {
        const startDate = allSessions[0].sessionDate;
        const endDate = allSessions[allSessions.length - 1].sessionDate;
        
        await db.update(schema.courseEditions)
          .set({ startDate, endDate, updatedAt: new Date().toISOString() })
          .where(eq(schema.courseEditions.id, session.editionId));
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      return new Response(JSON.stringify({ error: 'Errore nella cancellazione della sessione' }), {
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
