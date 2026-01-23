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

// Funzione per creare invito iCalendar
const createCalendarInvite = (data: {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endTime: string;
  location: string;
  attendeeEmail: string;
  organizerEmail: string;
  organizerName: string;
}): string => {
  const [year, month, day] = data.startDate.split('-');
  const [startHour, startMin] = data.startTime.split(':');
  const [endHour, endMin] = data.endTime.split(':');

  const dtstart = `${year}${month}${day}T${startHour}${startMin}00`;
  const dtend = `${year}${month}${day}T${endHour}${endMin}00`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${Math.random().toString(36).substr(2, 9)}-${Date.now()}@securitytools.local`;

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SecurityTools//Calendar Invite//IT
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${data.title}
DESCRIPTION:${data.description}
LOCATION:${data.location}
ORGANIZER;CN="${data.organizerName}":mailto:${data.organizerEmail}
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${data.attendeeEmail}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return ics;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = context.data.auth as { clientId: number } | undefined;
    
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json() as {
      sessionId: number;
      instructorEmail: string;
      instructorName: string;
      courseName: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      location: string;
      description?: string;
    };

    const { 
      sessionId, 
      instructorEmail, 
      instructorName, 
      courseName, 
      sessionDate, 
      startTime, 
      endTime, 
      location,
      description = 'Sessione di formazione'
    } = body;

    if (!sessionId || !instructorEmail || !instructorName || !courseName) {
      return new Response(JSON.stringify({ error: 'Parametri mancanti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Recupera le credenziali Gmail dal database
    const settingsResult = await context.env.DB.prepare(`
      SELECT email, password FROM emailSettings 
      WHERE clientId = ?
      LIMIT 1
    `).bind(auth.clientId).first() as any;

    if (!settingsResult) {
      return new Response(JSON.stringify({ 
        error: 'Credenziali Gmail non configurate. Configura le impostazioni email nel profilo.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const gmailEmail = settingsResult.email;
    const gmailPassword = decrypt(settingsResult.password);

    // Crea il transporter Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailPassword
      }
    });

    // Crea l'invito iCalendar
    const ics = createCalendarInvite({
      title: courseName,
      description,
      startDate: sessionDate,
      startTime,
      endTime,
      location,
      attendeeEmail: instructorEmail,
      organizerEmail: gmailEmail,
      organizerName: 'SecurityTools'
    });

    // Invia l'email con l'invito
    const info = await transporter.sendMail({
      from: gmailEmail,
      to: instructorEmail,
      subject: `Invito Calendario: ${courseName}`,
      html: `
        <h2>${courseName}</h2>
        <p><strong>Data:</strong> ${sessionDate}</p>
        <p><strong>Orario:</strong> ${startTime} - ${endTime}</p>
        <p><strong>Luogo:</strong> ${location}</p>
        <p><strong>Descrizione:</strong> ${description}</p>
        <p>Accetta l'invito per aggiungere l'evento al tuo calendario.</p>
      `,
      attachments: [
        {
          filename: 'invite.ics',
          content: ics,
          contentType: 'text/calendar; method=REQUEST'
        }
      ]
    });

    // Aggiorna il database con il timestamp di invio
    await context.env.DB.prepare(`
      UPDATE editionSessions 
      SET calendarInviteSentAt = CURRENT_TIMESTAMP
      WHERE id = ? AND clientId = ?
    `).bind(sessionId, auth.clientId).run();

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Invito calendario inviato con successo',
      messageId: info.messageId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error sending calendar invite:', error);
    
    // Log dettagliato per debugging
    const errorMessage = error.message || 'Errore sconosciuto';
    const errorCode = error.code || 'UNKNOWN';
    
    return new Response(JSON.stringify({ 
      error: 'Errore nell\'invio dell\'invito calendario',
      details: errorMessage,
      code: errorCode
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
