import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

// Funzione per decriptare
const decrypt = (encrypted: string): string => {
  try {
    return atob(encrypted);
  } catch {
    return encrypted;
  }
};

// Funzione per inviare email via Resend API
const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  fromEmail: string,
  resendApiKey?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!resendApiKey) {
    // Simula invio se non c'è API key
    console.log('Email would be sent to:', to, 'Subject:', subject);
    return { success: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `SecurityTools <${fromEmail}>`,
        to: [to],
        subject,
        html
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: JSON.stringify(errorData) };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
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

    // Recupera le impostazioni email
    const emailSettings = await db.query.emailSettings.findFirst({
      where: eq(schema.emailSettings.clientId, auth.clientId),
    });

    if (!emailSettings) {
      return new Response(JSON.stringify({ 
        error: 'Impostazioni email non configurate' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const senderEmail = emailSettings.email;
    const resendApiKey = emailSettings.resendApiKey ? decrypt(emailSettings.resendApiKey) : undefined;

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
        const urgencyText = daysUntilExpiration <= 7 ? 'URGENTE' : 'Promemoria';
        
        const result = await sendEmail(
          reg.student.email,
          `${urgencyText}: Il tuo certificato scade tra ${daysUntilExpiration} giorni`,
          `
            <h2>Promemoria Scadenza Certificato</h2>
            <p>Caro/a ${reg.student.firstName} ${reg.student.lastName},</p>
            <p>Ti ricordiamo che il tuo certificato per il corso <strong>${course?.title}</strong> scadrà tra <strong>${daysUntilExpiration} giorni</strong>.</p>
            <p><strong>Data di scadenza:</strong> ${expirationDate.toLocaleDateString('it-IT')}</p>
            ${daysUntilExpiration <= 7 ? '<p style="color: red; font-weight: bold;">⚠️ Azione urgente richiesta!</p>' : ''}
            <p>Per rinnovare il tuo certificato, contatta l'azienda di formazione.</p>
            <p>Cordiali saluti,<br>SecurityTools</p>
          `,
          senderEmail,
          resendApiKey
        );

        if (result.success) {
          emailsSent++;
          sentTo.push(`${reg.student.email} (studente)`);
          console.log(`Email inviata a studente: ${reg.student.email}`);
        } else {
          console.error(`Errore nell'invio email a studente ${reg.student.email}:`, result.error);
        }
      }

      // Notifica azienda
      if (notifyCompanies && reg.company?.email) {
        const urgencyText = daysUntilExpiration <= 7 ? 'URGENTE' : 'Promemoria';
        
        const result = await sendEmail(
          reg.company.email,
          `${urgencyText}: Certificato in scadenza - ${reg.student?.firstName} ${reg.student?.lastName}`,
          `
            <h2>Promemoria Scadenza Certificato</h2>
            <p>Gentile ${reg.company.name},</p>
            <p>Ti ricordiamo che il certificato di <strong>${reg.student?.firstName} ${reg.student?.lastName}</strong> per il corso <strong>${course?.title}</strong> scadrà tra <strong>${daysUntilExpiration} giorni</strong>.</p>
            <p><strong>Data di scadenza:</strong> ${expirationDate.toLocaleDateString('it-IT')}</p>
            ${daysUntilExpiration <= 7 ? '<p style="color: red; font-weight: bold;">⚠️ Azione urgente richiesta!</p>' : ''}
            <p>Per rinnovare il certificato, contatta il provider di formazione.</p>
            <p>Cordiali saluti,<br>SecurityTools</p>
          `,
          senderEmail,
          resendApiKey
        );

        if (result.success) {
          emailsSent++;
          sentTo.push(`${reg.company.email} (azienda)`);
          console.log(`Email inviata ad azienda: ${reg.company.email}`);
        } else {
          console.error(`Errore nell'invio email ad azienda ${reg.company.email}:`, result.error);
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
