import { api } from './api';

// Interfaccia per credenziali email
export interface EmailCredentials {
  email: string;
  resendApiKey?: string;
}

// Funzione per validare credenziali email via API backend
export const validateEmailCredentials = async (credentials: EmailCredentials): Promise<boolean> => {
  try {
    const response = await api.post('/api/email/test', credentials);
    return response.data.success === true;
  } catch (error) {
    console.error('Email credentials validation failed:', error);
    return false;
  }
};

// Funzione per inviare email via API backend
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string }[]
): Promise<boolean> => {
  try {
    const response = await api.post('/api/email/send', {
      to,
      subject,
      html,
      attachments
    });
    return response.data.success === true;
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

// Funzione per inviare invito calendario via API backend
export const sendCalendarInvite = async (
  to: string,
  calendarData: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endTime: string;
    location: string;
    organizerName: string;
    organizerEmail: string;
  }
): Promise<boolean> => {
  try {
    const response = await api.post('/api/email/send-invite', {
      instructorEmail: to,
      instructorName: 'Docente',
      courseName: calendarData.title,
      sessionDate: calendarData.startDate,
      startTime: calendarData.startTime,
      endTime: calendarData.endTime,
      location: calendarData.location,
      description: calendarData.description
    });
    return response.data.success === true;
  } catch (error) {
    console.error('Failed to send calendar invite:', error);
    return false;
  }
};

// Alias per retrocompatibilità
export const validateGmailCredentials = validateEmailCredentials;
export const sendGmailEmail = sendEmail;

// Interfaccia per retrocompatibilità
export interface GmailCredentials extends EmailCredentials {}
