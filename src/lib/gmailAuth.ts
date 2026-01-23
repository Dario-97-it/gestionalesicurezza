import nodemailer from 'nodemailer';

// Interfaccia per credenziali Gmail
export interface GmailCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

// Funzione per validare credenziali Gmail
export const validateGmailCredentials = async (credentials: GmailCredentials): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: credentials.email,
        pass: credentials.password
      }
    });

    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Gmail credentials validation failed:', error);
    return false;
  }
};

// Funzione per inviare email via Gmail SMTP
export const sendGmailEmail = async (
  credentials: GmailCredentials,
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: credentials.email,
        pass: credentials.password
      }
    });

    await transporter.sendMail({
      from: credentials.email,
      to,
      subject,
      html,
      attachments
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Funzione per creare invito iCalendar
export const createCalendarInvite = (data: {
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

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SecurityTools//Calendar Invite//IT
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${Math.random().toString(36).substr(2, 9)}@securitytools.local
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

// Funzione per inviare invito calendario
export const sendCalendarInvite = async (
  credentials: GmailCredentials,
  to: string,
  calendarData: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endTime: string;
    location: string;
    organizerName: string;
  }
): Promise<boolean> => {
  try {
    const ics = createCalendarInvite({
      ...calendarData,
      attendeeEmail: to,
      organizerEmail: credentials.email
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: credentials.email,
        pass: credentials.password
      }
    });

    await transporter.sendMail({
      from: credentials.email,
      to,
      subject: `Invito Calendario: ${calendarData.title}`,
      html: `
        <h2>${calendarData.title}</h2>
        <p><strong>Data:</strong> ${calendarData.startDate}</p>
        <p><strong>Orario:</strong> ${calendarData.startTime} - ${calendarData.endTime}</p>
        <p><strong>Luogo:</strong> ${calendarData.location}</p>
        <p><strong>Descrizione:</strong> ${calendarData.description}</p>
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

    return true;
  } catch (error) {
    console.error('Failed to send calendar invite:', error);
    return false;
  }
};
