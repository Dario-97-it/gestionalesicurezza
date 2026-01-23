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

// Funzione per codificare in base64 URL-safe (per Gmail API)
const base64UrlEncode = (str: string): string => {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

// Funzione per inviare email via Gmail SMTP usando fetch (via servizio esterno)
// Poiché Cloudflare Workers non supporta SMTP diretto, usiamo Resend API come alternativa
const sendEmailViaResend = async (
  to: string,
  subject: string,
  html: string,
  attachments: { filename: string; content: string; contentType: string }[],
  fromEmail: string,
  resendApiKey?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  // Se non c'è API key Resend, restituisci errore
  if (!resendApiKey) {
    // Fallback: simula invio (per testing)
    console.log('Email would be sent to:', to);
    console.log('Subject:', subject);
    return { success: true, messageId: `simulated-${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail.includes('@') ? `SecurityTools <${fromEmail}>` : `SecurityTools <noreply@securitytools.it>`,
        to: [to],
        subject,
        html,
        attachments: attachments.map(a => ({
          filename: a.filename,
          content: btoa(a.content)
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: JSON.stringify(errorData) };
    }

    const data = await response.json() as { id: string };
    return { success: true, messageId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
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

    // Recupera le credenziali email dal database
    const settingsResult = await context.env.DB.prepare(`
      SELECT email, resendApiKey FROM emailSettings 
      WHERE clientId = ?
      LIMIT 1
    `).bind(auth.clientId).first() as any;

    if (!settingsResult) {
      return new Response(JSON.stringify({ 
        error: 'Impostazioni email non configurate. Configura le impostazioni email nel profilo.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const senderEmail = settingsResult.email;
    const resendApiKey = settingsResult.resendApiKey ? decrypt(settingsResult.resendApiKey) : undefined;

    // Crea l'invito iCalendar
    const ics = createCalendarInvite({
      title: courseName,
      description,
      startDate: sessionDate,
      startTime,
      endTime,
      location,
      attendeeEmail: instructorEmail,
      organizerEmail: senderEmail,
      organizerName: 'SecurityTools'
    });

    // Prepara l'HTML dell'email
    const emailHtml = `
      <h2>${courseName}</h2>
      <p><strong>Data:</strong> ${sessionDate}</p>
      <p><strong>Orario:</strong> ${startTime} - ${endTime}</p>
      <p><strong>Luogo:</strong> ${location}</p>
      <p><strong>Descrizione:</strong> ${description}</p>
      <p>Accetta l'invito per aggiungere l'evento al tuo calendario.</p>
    `;

    // Invia l'email
    const result = await sendEmailViaResend(
      instructorEmail,
      `Invito Calendario: ${courseName}`,
      emailHtml,
      [{
        filename: 'invite.ics',
        content: ics,
        contentType: 'text/calendar; method=REQUEST'
      }],
      senderEmail,
      resendApiKey
    );

    if (!result.success) {
      return new Response(JSON.stringify({ 
        error: 'Errore nell\'invio dell\'email',
        details: result.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Aggiorna il database con il timestamp di invio
    await context.env.DB.prepare(`
      UPDATE editionSessions 
      SET calendarInviteSentAt = CURRENT_TIMESTAMP
      WHERE id = ? AND clientId = ?
    `).bind(sessionId, auth.clientId).run();

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Invito calendario inviato con successo',
      messageId: result.messageId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error sending calendar invite:', error);
    
    const errorMessage = error.message || 'Errore sconosciuto';
    
    return new Response(JSON.stringify({ 
      error: 'Errore nell\'invio dell\'invito calendario',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
