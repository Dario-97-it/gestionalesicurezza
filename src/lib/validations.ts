/**
 * Validazioni comuni per il sistema
 */

// Validazione email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validazione telefono (formato italiano)
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return true; // Opzionale
  const phoneRegex = /^(\+39|0)?[0-9]{9,11}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
};

// Validazione P.IVA italiana
export const isValidVatNumber = (vatNumber: string): boolean => {
  if (!vatNumber) return true; // Opzionale
  const vatRegex = /^[0-9]{11}$/;
  return vatRegex.test(vatNumber.replace(/[\s\-]/g, ''));
};

// Validazione Codice Fiscale italiano
export const isValidTaxCode = (taxCode: string): boolean => {
  if (!taxCode) return true; // Opzionale
  const taxRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
  return taxRegex.test(taxCode);
};

// Validazione data (formato YYYY-MM-DD)
export const isValidDate = (dateStr: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

// Validazione orario (formato HH:MM)
export const isValidTime = (timeStr: string): boolean => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
};

// Validazione che l'ora di fine sia dopo l'ora di inizio
export const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes > startMinutes;
};

// Validazione che la data di fine sia dopo la data di inizio
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return end > start;
};

// Validazione lunghezza stringa
export const isValidLength = (str: string, min: number, max: number): boolean => {
  return str.length >= min && str.length <= max;
};

// Validazione numero positivo
export const isPositiveNumber = (num: number | string): boolean => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return !isNaN(n) && n > 0;
};

// Validazione numero intero positivo
export const isPositiveInteger = (num: number | string): boolean => {
  const n = typeof num === 'string' ? parseInt(num) : num;
  return Number.isInteger(n) && n > 0;
};

// Validazione percentuale (0-100)
export const isValidPercentage = (num: number | string): boolean => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return !isNaN(n) && n >= 0 && n <= 100;
};

// Sanitizzazione stringa (rimuove caratteri speciali pericolosi)
export const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>\"']/g, '')
    .trim();
};

// Validazione password (almeno 8 caratteri, maiuscola, minuscola, numero)
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// Validazione URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validazione CSV (controlla che non abbia caratteri non validi)
export const isValidCsv = (csvText: string): boolean => {
  try {
    const lines = csvText.trim().split('\n');
    return lines.length > 1; // Almeno header + 1 riga
  } catch {
    return false;
  }
};

// Oggetto con tutti i messaggi di errore
export const validationMessages = {
  email: 'Inserisci un indirizzo email valido',
  phone: 'Inserisci un numero di telefono valido',
  vatNumber: 'Inserisci una P.IVA valida (11 cifre)',
  taxCode: 'Inserisci un Codice Fiscale valido',
  date: 'Inserisci una data valida (YYYY-MM-DD)',
  time: 'Inserisci un orario valido (HH:MM)',
  timeRange: 'L\'ora di fine deve essere dopo l\'ora di inizio',
  dateRange: 'La data di fine deve essere dopo la data di inizio',
  password: 'La password deve contenere almeno 8 caratteri, una maiuscola, una minuscola e un numero',
  required: 'Campo obbligatorio',
  minLength: (min: number) => `Minimo ${min} caratteri`,
  maxLength: (max: number) => `Massimo ${max} caratteri`,
  positiveNumber: 'Inserisci un numero positivo',
  percentage: 'Inserisci un numero tra 0 e 100',
  url: 'Inserisci un URL valido',
};
