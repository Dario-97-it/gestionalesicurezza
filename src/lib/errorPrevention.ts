/**
 * Sistema di Prevenzione Errori Umani
 * 
 * Validazioni logiche per prevenire errori comuni nel gestionale
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Valida che una data di inizio sia prima della data di fine
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string,
  fieldName = 'Data'
): ValidationError | null {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return {
      field: fieldName,
      message: `La data di inizio non può essere successiva alla data di fine`,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Valida che le ore di una sessione non superino le ore previste del corso
 */
export function validateSessionHours(
  sessionHours: number,
  courseHours: number,
  totalSessionHours: number
): ValidationError | null {
  if (sessionHours > courseHours) {
    return {
      field: 'sessionHours',
      message: `Le ore della sessione (${sessionHours}h) non possono superare le ore totali del corso (${courseHours}h)`,
      severity: 'error',
    };
  }

  if (totalSessionHours + sessionHours > courseHours) {
    return {
      field: 'sessionHours',
      message: `Le ore totali delle sessioni (${totalSessionHours + sessionHours}h) supererebbero le ore del corso (${courseHours}h)`,
      severity: 'warning',
    };
  }

  return null;
}

/**
 * Valida che il prezzo di una registrazione sia coerente
 */
export function validateRegistrationPrice(
  appliedPrice: number,
  coursePrice: number
): ValidationError | null {
  if (appliedPrice < 0) {
    return {
      field: 'priceApplied',
      message: 'Il prezzo non può essere negativo',
      severity: 'error',
    };
  }

  if (appliedPrice > coursePrice * 1.5) {
    return {
      field: 'priceApplied',
      message: `Il prezzo applicato (€${appliedPrice}) è significativamente superiore al prezzo del corso (€${coursePrice}). Confermare?`,
      severity: 'warning',
    };
  }

  if (appliedPrice < coursePrice * 0.5) {
    return {
      field: 'priceApplied',
      message: `Il prezzo applicato (€${appliedPrice}) è significativamente inferiore al prezzo del corso (€${coursePrice}). Confermare?`,
      severity: 'warning',
    };
  }

  return null;
}

/**
 * Valida che la percentuale di frequenza sia coerente
 */
export function validateAttendancePercentage(
  attendedHours: number,
  totalHours: number,
  minimumPercentage = 90
): ValidationError | null {
  if (totalHours === 0) {
    return {
      field: 'attendance',
      message: 'Il corso deve avere almeno 1 ora',
      severity: 'error',
    };
  }

  const percentage = (attendedHours / totalHours) * 100;

  if (percentage < minimumPercentage) {
    return {
      field: 'attendance',
      message: `Frequenza insufficiente: ${percentage.toFixed(1)}% (minimo richiesto: ${minimumPercentage}%)`,
      severity: 'warning',
    };
  }

  return null;
}

/**
 * Valida che una data di certificato sia coerente con le date del corso
 */
export function validateCertificateDate(
  certificateDate: Date | string,
  courseEndDate: Date | string
): ValidationError | null {
  const cert = new Date(certificateDate);
  const courseEnd = new Date(courseEndDate);

  if (cert < courseEnd) {
    return {
      field: 'certificateDate',
      message: 'La data del certificato non può essere prima della fine del corso',
      severity: 'error',
    };
  }

  // Avvertimento se il certificato è emesso più di 30 giorni dopo la fine del corso
  const daysAfter = Math.floor((cert.getTime() - courseEnd.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAfter > 30) {
    return {
      field: 'certificateDate',
      message: `Il certificato è emesso ${daysAfter} giorni dopo la fine del corso. Verificare la data.`,
      severity: 'warning',
    };
  }

  return null;
}

/**
 * Valida che i dati di un'edizione siano coerenti
 */
export function validateEdition(
  startDate: Date | string,
  endDate: Date | string,
  totalHours: number,
  courseHours: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Valida range date
  const dateError = validateDateRange(startDate, endDate, 'Data');
  if (dateError) errors.push(dateError);

  // Valida ore
  if (totalHours <= 0) {
    errors.push({
      field: 'totalHours',
      message: 'Le ore totali devono essere maggiori di 0',
      severity: 'error',
    });
  }

  if (totalHours > courseHours * 1.5) {
    errors.push({
      field: 'totalHours',
      message: `Le ore dell'edizione (${totalHours}h) superano significativamente le ore del corso (${courseHours}h)`,
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Valida che un'iscrizione sia coerente
 */
export function validateRegistration(
  studentId: number | null,
  courseId: number | null,
  editionId: number | null,
  price: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!studentId) {
    errors.push({
      field: 'studentId',
      message: 'Lo studente è obbligatorio',
      severity: 'error',
    });
  }

  if (!courseId) {
    errors.push({
      field: 'courseId',
      message: 'Il corso è obbligatorio',
      severity: 'error',
    });
  }

  if (!editionId) {
    errors.push({
      field: 'editionId',
      message: 'L\'edizione è obbligatoria',
      severity: 'error',
    });
  }

  const priceError = validateRegistrationPrice(price, 0); // Validazione base
  if (priceError) errors.push(priceError);

  return errors;
}

/**
 * Valida che un trasferimento studente sia coerente
 */
export function validateStudentTransfer(
  currentCompanyId: number | null,
  newCompanyId: number | null
): ValidationError | null {
  if (currentCompanyId === newCompanyId) {
    return {
      field: 'newCompanyId',
      message: 'Lo studente è già associato a questa azienda',
      severity: 'warning',
    };
  }

  if (!newCompanyId) {
    return {
      field: 'newCompanyId',
      message: 'Selezionare un\'azienda di destinazione',
      severity: 'error',
    };
  }

  return null;
}

/**
 * Valida che un'eliminazione sia sicura
 */
export function validateDeletion(
  itemType: string,
  relatedCount: number
): ValidationError | null {
  if (relatedCount > 0) {
    return {
      field: 'deletion',
      message: `Non è possibile eliminare questo ${itemType} perché ha ${relatedCount} record associati. Eliminare prima i record correlati.`,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Valida che un'azione sia sicura (doppio controllo)
 */
export function requiresConfirmation(
  action: string,
  data: any
): { required: boolean; message: string } {
  const confirmations: Record<string, (data: any) => boolean> = {
    'delete-student': (d) => d.registrations?.length > 0 || d.attendances?.length > 0,
    'delete-course': (d) => d.editions?.length > 0 || d.registrations?.length > 0,
    'delete-company': (d) => d.students?.length > 0,
    'delete-edition': (d) => d.registrations?.length > 0 || d.sessions?.length > 0,
    'transfer-student': (d) => d.registrations?.length > 0,
  };

  const requiresConfirm = confirmations[action]?.(data) ?? false;

  const messages: Record<string, string> = {
    'delete-student': 'Questo studente ha iscrizioni e presenze associate. Confermare l\'eliminazione?',
    'delete-course': 'Questo corso ha edizioni e iscrizioni associate. Confermare l\'eliminazione?',
    'delete-company': 'Questa azienda ha studenti associati. Confermare l\'eliminazione?',
    'delete-edition': 'Questa edizione ha iscrizioni e sessioni associate. Confermare l\'eliminazione?',
    'transfer-student': 'Questo studente ha iscrizioni attive. Il trasferimento non modificherà le iscrizioni. Confermare?',
  };

  return {
    required: requiresConfirm,
    message: messages[action] || 'Confermare questa azione?',
  };
}

/**
 * Valida che un certificato possa essere emesso
 */
export function validateCertificateIssuance(
  attendancePercentage: number,
  minimumPercentage = 90
): ValidationError | null {
  if (attendancePercentage < minimumPercentage) {
    return {
      field: 'attendance',
      message: `Impossibile emettere il certificato: frequenza insufficiente (${attendancePercentage.toFixed(1)}% < ${minimumPercentage}%)`,
      severity: 'error',
    };
  }

  return null;
}

export default {
  validateDateRange,
  validateSessionHours,
  validateRegistrationPrice,
  validateAttendancePercentage,
  validateCertificateDate,
  validateEdition,
  validateRegistration,
  validateStudentTransfer,
  validateDeletion,
  requiresConfirmation,
  validateCertificateIssuance,
};
