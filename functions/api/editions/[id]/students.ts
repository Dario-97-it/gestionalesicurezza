import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

// GET /api/editions/:id/students - Ottieni studenti iscritti all'edizione
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Metodo non supportato' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  try {
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

    // Recupera le iscrizioni con i dati degli studenti
    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.courseEditionId, editionId),
      with: {
        student: {
          with: {
            company: true,
          }
        },
      },
    });

    // Mappa i dati degli studenti
    const students = registrations
      .filter(r => r.student)
      .map(r => ({
        id: r.student!.id,
        firstName: r.student!.firstName,
        lastName: r.student!.lastName,
        fiscalCode: r.student!.fiscalCode,
        email: r.student!.email,
        phone: r.student!.phone,
        companyId: r.student!.companyId,
        companyName: r.student!.company?.name,
        registrationId: r.id,
        registrationStatus: r.status,
      }));

    return new Response(JSON.stringify({ students }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return new Response(JSON.stringify({ error: 'Errore nel recupero degli studenti' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
