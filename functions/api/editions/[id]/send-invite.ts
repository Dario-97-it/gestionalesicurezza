import { drizzle } from 'drizzle-orm/d1';
import { eq, and, asc } from 'drizzle-orm';
import * as schema from '../../../../drizzle/schema';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
}

// Funzioni per generare iCalendar
function formatICalDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function createDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

function generateICalendar(
  edition: any,
  course: any,
  instructor: any,
  sessions: any[],
  organizer: { name: string; email: string }
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SecurityTools//Course Management//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'X-WR-CALNAME:SecurityTools - Corsi',
    'X-WR-TIMEZONE:Europe/Rome',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Rome',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  // Genera un evento per ogni sessione
  sessions.forEach((session, index) => {
    const startDate = createDateTime(session.sessionDate, session.startTime);
    const endDate = createDateTime(session.sessionDate, session.endTime);
    
    const description = [
      `Corso: ${course.title}`,
      `Sessione ${index + 1} di ${sessions.length}`,
      `Durata: ${session.hours} ore`,
      session.notes ? `Note: ${session.notes}` : '',
    ].filter(Boolean).join('\\n');

    const eventLines = [
      'BEGIN:VEVENT',
      `UID:session-${session.id}-${edition.id}@securitytools.it`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `DTSTART;TZID=Europe/Rome:${formatICalDateLocal(startDate)}`,
      `DTEND;TZID=Europe/Rome:${formatICalDateLocal(endDate)}`,
      `SUMMARY:${escapeICalText(`${course.title} - Sessione ${index + 1}`)}`,
      `DESCRIPTION:${escapeICalText(description)}`,
      `LOCATION:${escapeICalText(session.location || edition.location)}`,
      `ORGANIZER;CN=${escapeICalText(organizer.name)}:mailto:${organizer.email}`,
      `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE;CN=${escapeICalText(`${instructor.firstName} ${instructor.lastName}`)}:mailto:${instructor.email}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      // Reminder 1 giorno prima
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Promemoria corso domani',
      'END:VALARM',
      // Reminder 1 ora prima
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Promemoria corso tra 1 ora',
      'END:VALARM',
      'END:VEVENT',
    ];

    lines.push(...eventLines);
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// POST /api/editions/:id/send-invite - Invia invito calendario al docente
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  
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

  const editionId = parseInt(params.id as string);
  if (isNaN(editionId)) {
    return new Response(JSON.stringify({ error: 'ID edizione non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Recupera l'edizione con corso e docente
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

    if (!edition.instructor) {
      return new Response(JSON.stringify({ error: 'Nessun docente assegnato a questa edizione' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!edition.instructor.email) {
      return new Response(JSON.stringify({ error: 'Il docente non ha un indirizzo email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Recupera le sessioni dell'edizione
    const sessions = await db.query.editionSessions.findMany({
      where: eq(schema.editionSessions.editionId, editionId),
      orderBy: [asc(schema.editionSessions.sessionDate), asc(schema.editionSessions.startTime)],
    });

    if (sessions.length === 0) {
      return new Response(JSON.stringify({ error: 'Nessuna sessione programmata per questa edizione' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Recupera info client per l'organizzatore
    const client = await db.query.clients.findFirst({
      where: eq(schema.clients.id, auth.clientId),
    });

    const organizer = {
      name: client?.companyName || 'SecurityTools',
      email: client?.email || 'noreply@securitytools.it',
    };

    // Genera il file iCalendar
    const icsContent = generateICalendar(
      edition,
      edition.course,
      edition.instructor,
      sessions,
      organizer
    );

    // Se abbiamo Resend API key, invia l'email
    if (env.RESEND_API_KEY) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${organizer.name} <onboarding@resend.dev>`,
          to: [edition.instructor.email],
          subject: `Invito: ${edition.course?.title || 'Corso'} - ${sessions.length} sessioni`,
          html: `
            <h2>Invito al corso: ${edition.course?.title || 'Corso'}</h2>
            <p>Gentile ${edition.instructor.firstName} ${edition.instructor.lastName},</p>
            <p>Sei stato assegnato come docente per il seguente corso:</p>
            <ul>
              <li><strong>Corso:</strong> ${edition.course?.title}</li>
              <li><strong>Location:</strong> ${edition.location}</li>
              <li><strong>Sessioni:</strong> ${sessions.length}</li>
              <li><strong>Totale ore:</strong> ${sessions.reduce((sum, s) => sum + s.hours, 0)}</li>
            </ul>
            <h3>Calendario sessioni:</h3>
            <table border="1" cellpadding="8" cellspacing="0">
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Orario</th>
                <th>Ore</th>
                <th>Location</th>
              </tr>
              ${sessions.map((s, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${new Date(s.sessionDate).toLocaleDateString('it-IT')}</td>
                  <td>${s.startTime} - ${s.endTime}</td>
                  <td>${s.hours}h</td>
                  <td>${s.location || edition.location}</td>
                </tr>
              `).join('')}
            </table>
            <p>In allegato trovi il file calendario (.ics) da importare nel tuo calendario.</p>
            <p>Cordiali saluti,<br>${organizer.name}</p>
          `,
          attachments: [
            {
              filename: `corso-${edition.id}.ics`,
              content: Buffer.from(icsContent).toString('base64'),
            }
          ],
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Resend error:', errorData);
        // Fallback: restituisci il file .ics per download manuale
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Email non inviata, ma puoi scaricare il file calendario',
          icsContent,
          emailError: true
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Invito inviato a ${edition.instructor.email}` 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Senza Resend, restituisci il file .ics per download
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'File calendario generato (email non configurata)',
        icsContent,
        downloadOnly: true
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error sending invite:', error);
    return new Response(JSON.stringify({ error: 'Errore nell\'invio dell\'invito' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
