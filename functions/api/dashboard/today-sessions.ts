/**
 * API Endpoint: Today's Sessions
 * GET /api/dashboard/today-sessions
 * 
 * Returns all course sessions scheduled for today.
 */

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

  const clientId = auth.clientId;
  const db = env.DB;
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  try {
    const { results: sessions } = await db.prepare(`
      SELECT 
        es.id,
        es.sessionDate,
        es.startTime,
        es.endTime,
        es.hours,
        es.location,
        ce.id as editionId,
        c.title as courseTitle,
        c.code as courseCode,
        i.firstName as instructorFirstName,
        i.lastName as instructorLastName
      FROM editionSessions es
      JOIN courseEditions ce ON ce.id = es.editionId
      JOIN courses c ON c.id = ce.courseId
      LEFT JOIN instructors i ON i.id = ce.instructorId
      WHERE es.sessionDate = ? AND es.clientId = ?
      ORDER BY es.startTime
    `).bind(today, clientId).all();

    return new Response(JSON.stringify({ sessions: sessions || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching today sessions:', error);
    return new Response(JSON.stringify({ error: 'Errore nel recupero delle sessioni di oggi', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
