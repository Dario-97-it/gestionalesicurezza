import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

// Calcola la data di scadenza del certificato
function calculateExpirationDate(issuedAt: string, validityMonths: number): Date {
  const issued = new Date(issuedAt);
  const expiration = new Date(issued);
  expiration.setMonth(expiration.getMonth() + validityMonths);
  return expiration;
}

// GET /api/certificates/expiring - Recupera certificati in scadenza
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
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

  try {
    // Query per trovare certificati in scadenza
    // Consideriamo "in scadenza" quelli che scadono entro 30 giorni
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Recupera tutte le registrazioni con certificati emessi
    const registrations = await db.query.registrations.findMany({
      where: and(
        eq(schema.registrations.clientId, auth.clientId),
        eq(schema.registrations.certificateIssued, true)
      ),
      with: {
        student: true,
        courseEdition: {
          with: {
            course: true,
          }
        },
        company: true,
      }
    });

    // Filtra i certificati in scadenza
    const expiringCertificates = registrations
      .map(reg => {
        if (!reg.certificateIssuedAt) return null;
        
        const course = reg.courseEdition?.course;
        const validityMonths = course?.certificateValidityMonths || 12;
        const expirationDate = calculateExpirationDate(reg.certificateIssuedAt, validityMonths);
        
        const daysUntilExpiration = Math.floor(
          (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Ritorna solo se scade entro 30 giorni
        if (daysUntilExpiration <= 30 && daysUntilExpiration >= 0) {
          return {
            id: reg.id,
            studentId: reg.studentId,
            studentName: `${reg.student?.firstName} ${reg.student?.lastName}`,
            studentEmail: reg.student?.email,
            courseName: course?.title,
            courseEditionId: reg.courseEditionId,
            companyName: reg.company?.name,
            certificateIssuedAt: reg.certificateIssuedAt,
            expirationDate: expirationDate.toISOString(),
            daysUntilExpiration,
            urgency: daysUntilExpiration <= 7 ? 'high' : daysUntilExpiration <= 14 ? 'medium' : 'low'
          };
        }
        return null;
      })
      .filter((cert): cert is NonNullable<typeof cert> => cert !== null)
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

    return new Response(JSON.stringify({
      success: true,
      data: expiringCertificates,
      total: expiringCertificates.length,
      summary: {
        high: expiringCertificates.filter(c => c.urgency === 'high').length,
        medium: expiringCertificates.filter(c => c.urgency === 'medium').length,
        low: expiringCertificates.filter(c => c.urgency === 'low').length,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching expiring certificates:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore nel recupero dei certificati in scadenza',
      details: (error as any).message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
