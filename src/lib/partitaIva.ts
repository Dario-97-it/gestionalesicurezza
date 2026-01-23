/**
 * Utility per la validazione della Partita IVA italiana
 * Conforme alle specifiche dell'Agenzia delle Entrate
 */

export interface PIVAValidationResult {
  isValid: boolean;
  isChecksumValid: boolean;
  errors: string[];
  warnings: string[];
  formatted: string;
}

/**
 * Normalizza la partita IVA (rimuove spazi, trattini, prefisso IT)
 */
export function normalizzaPIVA(piva: string): string {
  return piva
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/-/g, '')
    .replace(/^IT/, '');
}

/**
 * Valida il formato della partita IVA (11 cifre)
 */
export function validaFormato(piva: string): boolean {
  return /^\d{11}$/.test(piva);
}

/**
 * Calcola e valida il checksum della partita IVA italiana
 * Algoritmo di Luhn modificato
 */
export function validaChecksum(piva: string): boolean {
  if (!validaFormato(piva)) return false;
  
  const cifre = piva.split('').map(Number);
  
  // Somma delle cifre in posizione dispari (1, 3, 5, 7, 9)
  let sommaDispari = 0;
  for (let i = 0; i < 10; i += 2) {
    sommaDispari += cifre[i];
  }
  
  // Somma delle cifre in posizione pari (2, 4, 6, 8, 10)
  // Ogni cifra viene raddoppiata e se > 9, si sottrae 9
  let sommaPari = 0;
  for (let i = 1; i < 10; i += 2) {
    let doppio = cifre[i] * 2;
    if (doppio > 9) {
      doppio -= 9;
    }
    sommaPari += doppio;
  }
  
  // Il carattere di controllo (11a cifra) deve rendere la somma totale divisibile per 10
  const somma = sommaDispari + sommaPari;
  const resto = somma % 10;
  const carattereControllo = resto === 0 ? 0 : 10 - resto;
  
  return cifre[10] === carattereControllo;
}

/**
 * Estrae informazioni dalla partita IVA
 * Le prime 7 cifre identificano il contribuente
 * Le cifre 8-10 identificano l'ufficio provinciale
 * L'11a cifra è il carattere di controllo
 */
export function estraiInfo(piva: string): {
  codiceContribuente: string;
  codiceUfficio: string;
  carattereControllo: string;
} | null {
  const pivaNorm = normalizzaPIVA(piva);
  if (!validaFormato(pivaNorm)) return null;
  
  return {
    codiceContribuente: pivaNorm.substring(0, 7),
    codiceUfficio: pivaNorm.substring(7, 10),
    carattereControllo: pivaNorm.substring(10, 11)
  };
}

/**
 * Validazione completa della partita IVA
 */
export function validaPIVA(piva: string): PIVAValidationResult {
  const result: PIVAValidationResult = {
    isValid: false,
    isChecksumValid: false,
    errors: [],
    warnings: [],
    formatted: ''
  };
  
  if (!piva) {
    result.errors.push('Partita IVA mancante');
    return result;
  }
  
  const pivaNorm = normalizzaPIVA(piva);
  result.formatted = pivaNorm;
  
  if (pivaNorm.length !== 11) {
    result.errors.push(`Lunghezza non valida: ${pivaNorm.length} cifre (richieste 11)`);
    return result;
  }
  
  if (!validaFormato(pivaNorm)) {
    result.errors.push('Formato non valido: la partita IVA deve contenere solo cifre');
    return result;
  }
  
  // Verifica che non sia composta da tutti zeri
  if (pivaNorm === '00000000000') {
    result.errors.push('Partita IVA non valida: tutti zeri');
    return result;
  }
  
  // Verifica checksum
  result.isChecksumValid = validaChecksum(pivaNorm);
  if (!result.isChecksumValid) {
    result.warnings.push('Attenzione: checksum non valido');
  }
  
  // Verifica codice ufficio (deve essere tra 001 e 100 o alcuni codici speciali)
  const codiceUfficio = parseInt(pivaNorm.substring(7, 10));
  if (codiceUfficio < 1 || (codiceUfficio > 100 && codiceUfficio !== 120 && codiceUfficio !== 121)) {
    result.warnings.push('Codice ufficio provinciale insolito');
  }
  
  // Se arriviamo qui, il formato è valido
  result.isValid = true;
  
  return result;
}

/**
 * Formatta la partita IVA con il prefisso IT
 */
export function formattaPIVA(piva: string): string {
  const pivaNorm = normalizzaPIVA(piva);
  if (validaFormato(pivaNorm)) {
    return `IT${pivaNorm}`;
  }
  return piva;
}

/**
 * Verifica se due partite IVA sono uguali (normalizzate)
 */
export function confrontaPIVA(piva1: string, piva2: string): boolean {
  return normalizzaPIVA(piva1) === normalizzaPIVA(piva2);
}

export default {
  normalizzaPIVA,
  validaPIVA,
  validaChecksum,
  validaFormato,
  estraiInfo,
  formattaPIVA,
  confrontaPIVA
};
