import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';
import nodemailer from 'nodemailer';

interface Env {
  DB: D1Database;
}

// Funzione per decriptare
const decrypt = (encrypted: string): string => {
  try {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  } catch {
    return encrypted;
  }
};

// Calcola la data di scadenza del certificato
function calculateExpirationDate(issuedAt: string, validityMonths: number): Date {
  const issued = new Date(issuedAt);
  const expiration = new Date(issued);
  expiration.setMonth(expiration.getMonth() + validityMonths);
  return expiration;
}

// POST /api/certificates/notify-expiring - Invia notifiche email per certificati in scadenza
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
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
    const body = await request.json() as {
      registrationIds?: number[];
      notifyStudents?: boolean;
      notifyCompanies?: boolean;
    };

    const {
      registrationIds,
      notifyStudents = true,
      notifyCompanies = true
    } = body;

    // Recupera le credenziali Gmail
    const emailSettings = await db.query.emailSettings.findFirst({
      where: eq(schema.emailSettings.clientId, auth.clientId),
    });

    if (!emailSettings) {
      return new Response(JSON.stringify({ 
        error: 'Credenziali Gmail non configurate' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const gmailEmail = emailSettings.email;
    const gmailPassword = decrypt(emailSettings.password);

    // Crea il transporter Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailPassword
      }
    });

    // Recupera le registrazioni da notificare
    let query = db.query.registrations.findMany({
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

    const registrations = await query;

    const today = new Date();
    let emailsSent = 0;
    const sentTo: string[] = [];

    // Processa ogni registrazione
    for (const reg of registrations) {
      if (!reg.certificateIssuedAt) continue;

      // Se specificati registrationIds, filtra
      if (registrationIds && !registrationIds.includes(reg.id)) continue;

      const course = reg.courseEdition?.course;
      const validityMonths = course?.certificateValidityMonths || 12;
      const expirationDate = calculateExpirationDate(reg.certificateIssuedAt, validityMonths);
      
      const daysUntilExpiration = Math.floor(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Notifica solo se scade entro 30 giorni
      if (daysUntilExpiration > 30 || daysUntilExpiration < 0) continue;

      // Notifica studente
      if (notifyStudents && reg.student?.email) {
        try {
          const urgencyText = daysUntilExpiration <= 7 ? 'URGENTE' : 'Promemoria';
          
          await transporter.sendMail({
            from: gmailEmail,
            to: reg.student.email,
            subject: `${urgencyText}: Il tuo certificato scade tra ${daysUntilExpiration} giorni`,
            html: `
              <h2>Promemoria Scadenza Certificato</h2>
              <p>Caro/a ${reg.student.firstName} ${reg.student.lastName},</p>
              <p>Ti ricordiamo che il tuo certificato per il corso <strong>${course?.title}</strong> scadrà tra <strong>${daysUntilExpiration} giorni</strong>.</p>
              <p><strong>Data di scadenza:</strong> ${expirationDate.toLocaleDateString('it-IT')}</p>
              ${daysUntilExpiration <= 7 ? '<p style="color: red; font-weight: bold;">⚠️ Azione urgente richiesta!</p>' : ''}
              <p>Per rinnovare il tuo certificato, contatta l'azienda di formazione.</p>
              <p>Cordiali saluti,<br>SecurityTools</p>
            `
          });

          emailsSent++;
          sentTo.push(`${reg.student.email} (studente)`);
          console.log(`Email inviata a studente: ${reg.student.email}`);
        } catch (error) {
          console.error(`Errore nell'invio email a studente ${reg.student.email}:`, error);
        }
      }

      // Notifica azienda
      if (notifyCompanies && reg.company?.email) {
        try {
          const urgencyText = daysUntilExpiration <= 7 ? 'URGENTE' : 'Promemoria';
          
          await transporter.sendMail({
            from: gmailEmail,
            to: reg.company.email,
            subject: `${urgencyText}: Certificato in scadenza - ${reg.student?.firstName} ${reg.student?.lastName}`,
            html: `
              <h2>Promemoria Scadenza Certificato</h2>
              <p>Gentile ${reg.company.name},</p>
              <p>Ti ricordiamo che il certificato di <strong>${reg.student?.firstName} ${reg.student?.lastName}</strong> per il corso <strong>${course?.title}</strong> scadrà tra <strong>${daysUntilExpiration} giorni</strong>.</p>
              <p><strong>Data di scadenza:</strong> ${expirationDate.toLocaleDateString('it-IT')}</p>
              ${daysUntilExpiration <= 7 ? '<p style="color: red; font-weight: bold;">⚠️ Azione urgente richiesta!</p>' : ''}
              <p>Per rinnovare il certificato, contatta il provider di formazione.</p>
              <p>Cordiali saluti,<br>SecurityTools</p>
            `
          });

          emailsSent++;
          sentTo.push(`${reg.company.email} (azienda)`);
          console.log(`Email inviata ad azienda: ${reg.company.email}`);
        } catch (error) {
          console.error(`Errore nell'invio email ad azienda ${reg.company.email}:`, error);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${emailsSent} notifiche inviate con successo`,
      emailsSent,
      sentTo
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending expiration notifications:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore nell\'invio delle notifiche',
      details: (error as any).message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
