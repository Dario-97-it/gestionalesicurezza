import { drizzle } from 'drizzle-orm/d1';
import { eq, and, asc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

// GET /api/editions/:id/sessions - Lista sessioni di un'edizione
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const db = drizzle(env.DB, { schema });
  const auth = context.data.auth as AuthContext | undefined;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
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
      with: {
        course: true,
        instructor: true,
      }
    });

    if (!edition) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sessions = await db.query.editionSessions.findMany({
      where: eq(schema.editionSessions.editionId, editionId),
      orderBy: [asc(schema.editionSessions.sessionDate), asc(schema.editionSessions.startTime)],
    });

    // Calcola totale ore
    const totalHours = sessions.reduce((sum, s) => sum + s.hours, 0);

    return new Response(JSON.stringify({
      sessions,
      totalHours,
      courseHours: edition.course?.durationHours || 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return new Response(JSON.stringify({ error: 'Errore nel caricamento delle sessioni' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/editions/:id/sessions - Crea nuova sessione
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const db = drizzle(env.DB, { schema });
  const auth = context.data.auth as AuthContext | undefined;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
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
      with: {
        course: true,
      }
    });

    if (!edition) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json() as {
      sessionDate: string;
      startTime: string;
      endTime: string;
      hours: number;
      location?: string;
      notes?: string;
    };

    const { sessionDate, startTime, endTime, hours, location, notes } = body;

    if (!sessionDate || !startTime || !endTime || !hours) {
      return new Response(JSON.stringify({ error: 'Dati sessione incompleti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [newSession] = await db.insert(schema.editionSessions).values({
      clientId: auth.clientId,
      editionId,
      sessionDate,
      startTime,
      endTime,
      hours,
      location: location || edition.location,
      notes,
    }).returning();

    // Aggiorna le date dell'edizione se necessario
    const allSessions = await db.query.editionSessions.findMany({
      where: eq(schema.editionSessions.editionId, editionId),
      orderBy: [asc(schema.editionSessions.sessionDate)],
    });

    if (allSessions.length > 0) {
      const startDate = allSessions[0].sessionDate;
      const endDate = allSessions[allSessions.length - 1].sessionDate;
      
      await db.update(schema.courseEditions)
        .set({ startDate, endDate, updatedAt: new Date().toISOString() })
        .where(eq(schema.courseEditions.id, editionId));
    }

    return new Response(JSON.stringify(newSession), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    return new Response(JSON.stringify({ error: 'Errore nella creazione della sessione' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
