/**
 * Validazioni Logiche Specifiche del Gestionale SecurityTools
 * 
 * Controlli per prevenire errori di logica di business
 */

export interface BusinessLogicError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * Valida che un'edizione non sia modificata se ha iscrizioni attive
 */
export function validateEditionModification(
  registrationCount: number,
  attendanceCount: number
): BusinessLogicError | null {
  if (registrationCount > 0 || attendanceCount > 0) {
    return {
      code: 'EDITION_HAS_ACTIVE_DATA',
      message: 'Non è possibile modificare un\'edizione con iscrizioni o presenze registrate',
      severity: 'error',
      suggestion: 'Eliminare prima le iscrizioni e le presenze associate',
    };
  }

  return null;
}

/**
 * Valida che non ci siano iscrizioni duplicate per lo stesso studente/corso/edizione
 */
export function validateDuplicateRegistration(
  existingRegistrations: any[],
  studentId: number,
  courseId: number,
  editionId: number
): BusinessLogicError | null {
  const duplicate = existingRegistrations.find(
    r => r.studentId === studentId && r.courseId === courseId && r.editionId === editionId
  );

  if (duplicate) {
    return {
      code: 'DUPLICATE_REGISTRATION',
      message: 'Questo studente è già iscritto a questo corso in questa edizione',
      severity: 'error',
      suggestion: 'Modificare l\'iscrizione esistente invece di crearne una nuova',
    };
  }

  return null;
}

/**
 * Valida che le presenze siano registrate solo per sessioni dell'edizione corretta
 */
export function validateAttendanceSession(
  sessionEditionId: number,
  registrationEditionId: number
): BusinessLogicError | null {
  if (sessionEditionId !== registrationEditionId) {
    return {
      code: 'ATTENDANCE_WRONG_EDITION',
      message: 'La sessione non appartiene all\'edizione dell\'iscrizione',
      severity: 'error',
      suggestion: 'Verificare che la sessione sia della corretta edizione',
    };
  }

  return null;
}

/**
 * Valida che le presenze non superino le ore della sessione
 */
export function validateAttendanceHours(
  attendedHours: number,
  sessionHours: number
): BusinessLogicError | null {
  if (attendedHours > sessionHours) {
    return {
      code: 'ATTENDANCE_EXCEEDS_SESSION',
      message: `Le ore presenti (${attendedHours}h) non possono superare le ore della sessione (${sessionHours}h)`,
      severity: 'error',
    };
  }

  if (attendedHours === 0) {
    return {
      code: 'ATTENDANCE_ZERO_HOURS',
      message: 'Le ore presenti devono essere maggiori di 0',
      severity: 'error',
    };
  }

  return null;
}

/**
 * Valida che un certificato non sia emesso per studenti con frequenza insufficiente
 */
export function validateCertificateEligibility(
  attendancePercentage: number,
  minimumPercentage = 90
): BusinessLogicError | null {
  if (attendancePercentage < minimumPercentage) {
    return {
      code: 'INSUFFICIENT_ATTENDANCE',
      message: `Lo studente non ha la frequenza minima richiesta (${attendancePercentage.toFixed(1)}% < ${minimumPercentage}%)`,
      severity: 'error',
      suggestion: 'Registrare ulteriori presenze o modificare il requisito di frequenza',
    };
  }

  return null;
}

/**
 * Valida che un certificato non sia emesso due volte per lo stesso studente/corso
 */
export function validateDuplicateCertificate(
  existingCertificates: any[],
  studentId: number,
  courseId: number
): BusinessLogicError | null {
  const duplicate = existingCertificates.find(
    c => c.studentId === studentId && c.courseId === courseId
  );

  if (duplicate) {
    return {
      code: 'DUPLICATE_CERTIFICATE',
      message: 'Un certificato è già stato emesso per questo studente in questo corso',
      severity: 'error',
      suggestion: 'Modificare il certificato esistente o verificare i dati',
    };
  }

  return null;
}

/**
 * Valida che un'email non sia duplicata nel sistema
 */
export function validateUniqueEmail(
  email: string,
  existingEmails: string[],
  excludeId?: number
): BusinessLogicError | null {
  if (existingEmails.includes(email.toLowerCase())) {
    return {
      code: 'DUPLICATE_EMAIL',
      message: `L'email ${email} è già utilizzata nel sistema`,
      severity: 'error',
      suggestion: 'Utilizzare un\'email diversa o verificare i dati',
    };
  }

  return null;
}

/**
 * Valida che non ci siano conflitti di orario tra sessioni
 */
export function validateSessionConflict(
  newSessionStart: Date,
  newSessionEnd: Date,
  existingSessions: Array<{ startTime: Date; endTime: Date }>
): BusinessLogicError | null {
  const newStart = new Date(newSessionStart).getTime();
  const newEnd = new Date(newSessionEnd).getTime();

  const conflict = existingSessions.some(session => {
    const existStart = new Date(session.startTime).getTime();
    const existEnd = new Date(session.endTime).getTime();

    // Verifica sovrapposizione
    return (newStart < existEnd && newEnd > existStart);
  });

  if (conflict) {
    return {
      code: 'SESSION_CONFLICT',
      message: 'Esiste una sovrapposizione di orario con un\'altra sessione',
      severity: 'warning',
      suggestion: 'Modificare l\'orario della sessione per evitare conflitti',
    };
  }

  return null;
}

/**
 * Valida che un'azienda non sia eliminata se ha studenti associati
 */
export function validateCompanyDeletion(
  studentCount: number
): BusinessLogicError | null {
  if (studentCount > 0) {
    return {
      code: 'COMPANY_HAS_STUDENTS',
      message: `Non è possibile eliminare un\'azienda con ${studentCount} studenti associati`,
      severity: 'error',
      suggestion: 'Trasferire gli studenti a un\'altra azienda prima di eliminare',
    };
  }

  return null;
}

/**
 * Valida che un corso non sia eliminato se ha edizioni attive
 */
export function validateCourseDeletion(
  editionCount: number,
  registrationCount: number
): BusinessLogicError | null {
  if (editionCount > 0) {
    return {
      code: 'COURSE_HAS_EDITIONS',
      message: `Non è possibile eliminare un corso con ${editionCount} edizioni associate`,
      severity: 'error',
      suggestion: 'Eliminare prima le edizioni del corso',
    };
  }

  if (registrationCount > 0) {
    return {
      code: 'COURSE_HAS_REGISTRATIONS',
      message: `Non è possibile eliminare un corso con ${registrationCount} iscrizioni associate`,
      severity: 'error',
      suggestion: 'Eliminare prima le iscrizioni del corso',
    };
  }

  return null;
}

/**
 * Valida che un docente non sia eliminato se ha sessioni assegnate
 */
export function validateInstructorDeletion(
  sessionCount: number
): BusinessLogicError | null {
  if (sessionCount > 0) {
    return {
      code: 'INSTRUCTOR_HAS_SESSIONS',
      message: `Non è possibile eliminare un docente con ${sessionCount} sessioni assegnate`,
      severity: 'error',
      suggestion: 'Riassegnare le sessioni a un altro docente prima di eliminare',
    };
  }

  return null;
}

/**
 * Valida che le ore totali di un'edizione siano coerenti con le sessioni
 */
export function validateEditionHoursConsistency(
  editionTotalHours: number,
  sessionsTotalHours: number
): BusinessLogicError | null {
  if (Math.abs(editionTotalHours - sessionsTotalHours) > 0.5) {
    return {
      code: 'HOURS_MISMATCH',
      message: `Le ore totali dell'edizione (${editionTotalHours}h) non corrispondono alla somma delle sessioni (${sessionsTotalHours}h)`,
      severity: 'warning',
      suggestion: 'Verificare che le ore delle sessioni siano corrette',
    };
  }

  return null;
}

/**
 * Valida che il prezzo di un'edizione sia ragionevole
 */
export function validateEditionPrice(
  price: number,
  coursePrice: number
): BusinessLogicError | null {
  if (price < 0) {
    return {
      code: 'INVALID_PRICE',
      message: 'Il prezzo non può essere negativo',
      severity: 'error',
    };
  }

  if (price > coursePrice * 2) {
    return {
      code: 'PRICE_TOO_HIGH',
      message: `Il prezzo dell'edizione (€${price}) è significativamente superiore al prezzo del corso (€${coursePrice})`,
      severity: 'warning',
      suggestion: 'Verificare che il prezzo sia corretto',
    };
  }

  return null;
}

/**
 * Valida che una data di inizio edizione non sia nel passato
 */
export function validateEditionStartDate(
  startDate: Date | string
): BusinessLogicError | null {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    return {
      code: 'START_DATE_IN_PAST',
      message: 'La data di inizio non può essere nel passato',
      severity: 'error',
      suggestion: 'Selezionare una data futura',
    };
  }

  return null;
}

export default {
  validateEditionModification,
  validateDuplicateRegistration,
  validateAttendanceSession,
  validateAttendanceHours,
  validateCertificateEligibility,
  validateDuplicateCertificate,
  validateUniqueEmail,
  validateSessionConflict,
  validateCompanyDeletion,
  validateCourseDeletion,
  validateInstructorDeletion,
  validateEditionHoursConsistency,
  validateEditionPrice,
  validateEditionStartDate,
};
