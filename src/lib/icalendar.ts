/**
 * Utility per generare file iCalendar (.ics)
 * Formato standard per inviti calendario compatibile con Google Calendar, Outlook, Apple Calendar, ecc.
 */

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR';
    rsvp?: boolean;
  }>;
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  sequence?: number;
  created?: Date;
  lastModified?: Date;
}

/**
 * Formatta una data in formato iCalendar (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Formatta una data locale in formato iCalendar (YYYYMMDDTHHMMSS)
 */
function formatICalDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escape caratteri speciali per iCalendar
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Genera un singolo evento iCalendar
 */
export function generateICalEvent(event: CalendarEvent): string {
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDateLocal(event.startDate)}`,
    `DTEND:${formatICalDateLocal(event.endDate)}`,
    `SUMMARY:${escapeICalText(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER;CN=${escapeICalText(event.organizer.name)}:mailto:${event.organizer.email}`);
  }

  if (event.attendees) {
    for (const attendee of event.attendees) {
      const role = attendee.role || 'REQ-PARTICIPANT';
      const rsvp = attendee.rsvp !== false ? 'TRUE' : 'FALSE';
      lines.push(`ATTENDEE;ROLE=${role};RSVP=${rsvp};CN=${escapeICalText(attendee.name)}:mailto:${attendee.email}`);
    }
  }

  if (event.status) {
    lines.push(`STATUS:${event.status}`);
  }

  if (event.sequence !== undefined) {
    lines.push(`SEQUENCE:${event.sequence}`);
  }

  if (event.created) {
    lines.push(`CREATED:${formatICalDate(event.created)}`);
  }

  if (event.lastModified) {
    lines.push(`LAST-MODIFIED:${formatICalDate(event.lastModified)}`);
  }

  // Aggiungi reminder 1 giorno prima e 1 ora prima
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Promemoria corso',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Promemoria corso tra 1 ora',
    'END:VALARM'
  );

  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

/**
 * Genera un file iCalendar completo con uno o più eventi
 */
export function generateICalendar(events: CalendarEvent[], calendarName: string = 'SecurityTools'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SecurityTools//Course Management//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Rome',
    // Definizione timezone Italia
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

  for (const event of events) {
    lines.push(generateICalEvent(event));
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Genera un UID univoco per un evento
 */
export function generateEventUID(prefix: string, id: number | string): string {
  return `${prefix}-${id}-${Date.now()}@securitytools.it`;
}

/**
 * Crea una data da stringa data e orario
 */
export function createDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Genera eventi calendario per tutte le sessioni di un'edizione
 */
export function generateEditionCalendarEvents(
  edition: {
    id: number;
    courseName: string;
    location: string;
    instructorName?: string;
    instructorEmail?: string;
  },
  sessions: Array<{
    id: number;
    sessionDate: string;
    startTime: string;
    endTime: string;
    location?: string;
    notes?: string;
  }>,
  organizer: { name: string; email: string }
): CalendarEvent[] {
  return sessions.map((session, index) => {
    const startDate = createDateTime(session.sessionDate, session.startTime);
    const endDate = createDateTime(session.sessionDate, session.endTime);
    
    const description = [
      `Corso: ${edition.courseName}`,
      `Sessione ${index + 1} di ${sessions.length}`,
      edition.instructorName ? `Docente: ${edition.instructorName}` : '',
      session.notes ? `Note: ${session.notes}` : '',
    ].filter(Boolean).join('\\n');

    const event: CalendarEvent = {
      uid: generateEventUID('session', session.id),
      summary: `${edition.courseName} - Sessione ${index + 1}`,
      description,
      location: session.location || edition.location,
      startDate,
      endDate,
      organizer,
      status: 'CONFIRMED',
      sequence: 0,
      created: new Date(),
      lastModified: new Date(),
    };

    // Aggiungi docente come partecipante se disponibile
    if (edition.instructorEmail) {
      event.attendees = [{
        name: edition.instructorName || 'Docente',
        email: edition.instructorEmail,
        role: 'REQ-PARTICIPANT',
        rsvp: true,
      }];
    }

    return event;
  });
}

/**
 * Scarica un file .ics nel browser
 */
export function downloadICalendar(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera link per aggiungere evento a Google Calendar
 */
export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.summary,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
