/**
 * API Endpoint: Edition Registrations
 * GET /api/editions/:id/registrations
 * 
 * Returns all registrations for a specific course edition with student and company details.
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
  const { env, params, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const editionId = params.id;
  const clientId = auth.clientId;
  const db = env.DB;

  try {
    // Fetch registrations with student and company details
    const { results: registrations } = await db.prepare(`
      SELECT 
        r.id,
        r.studentId,
        r.companyId,
        r.status,
        r.priceApplied,
        r.certificateDate,
        r.recommendedNextEditionId,
        r.notes,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        s.fiscalCode as studentFiscalCode,
        s.email as studentEmail,
        c.name as companyName
      FROM registrations r
      LEFT JOIN students s ON s.id = r.studentId
      LEFT JOIN companies c ON c.id = r.companyId
      WHERE r.courseEditionId = ? AND r.clientId = ?
      ORDER BY c.name, s.lastName, s.firstName
    `).bind(editionId, clientId).all();

    // Format the response
    const formattedRegistrations = (registrations || []).map((reg: any) => ({
      id: reg.id,
      studentId: reg.studentId,
      companyId: reg.companyId,
      status: reg.status,
      priceApplied: reg.priceApplied,
      certificateDate: reg.certificateDate,
      recommendedNextEditionId: reg.recommendedNextEditionId,
      notes: reg.notes,
      student: {
        id: reg.studentId,
        firstName: reg.studentFirstName,
        lastName: reg.studentLastName,
        fiscalCode: reg.studentFiscalCode,
        email: reg.studentEmail,
      },
      company: reg.companyId ? {
        id: reg.companyId,
        name: reg.companyName,
      } : null,
    }));

    return new Response(JSON.stringify({ registrations: formattedRegistrations }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching edition registrations:', error);
    return new Response(JSON.stringify({ error: 'Errore nel recupero delle iscrizioni', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
