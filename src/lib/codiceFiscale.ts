/**
 * Utility per la validazione e il reverse engineering del Codice Fiscale italiano
 * Conforme alle specifiche del Ministero delle Finanze
 */

// Tabella dei mesi per il codice fiscale
const MESI: Record<string, number> = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'H': 6,
  'L': 7, 'M': 8, 'P': 9, 'R': 10, 'S': 11, 'T': 12
};

// Tabella inversa mesi
const MESI_INVERSO: Record<number, string> = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'H',
  7: 'L', 8: 'M', 9: 'P', 10: 'R', 11: 'S', 12: 'T'
};

// Valori per il calcolo del carattere di controllo (posizioni dispari)
const VALORI_DISPARI: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

// Valori per il calcolo del carattere di controllo (posizioni pari)
const VALORI_PARI: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
  'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

// Caratteri di controllo
const CARATTERI_CONTROLLO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Tabella omocodia (sostituzione cifre con lettere)
const OMOCODIA_CIFRE: Record<string, string> = {
  'L': '0', 'M': '1', 'N': '2', 'P': '3', 'Q': '4',
  'R': '5', 'S': '6', 'T': '7', 'U': '8', 'V': '9'
};

// Database comuni italiani (campione - in produzione usare API o database completo)
// Formato: codice catastale -> { nome, provincia }
const COMUNI_CATASTALI: Record<string, { nome: string; provincia: string }> = {
  'A001': { nome: 'ABANO TERME', provincia: 'PD' },
  'A004': { nome: 'ABBADIA CERRETO', provincia: 'LO' },
  'A944': { nome: 'BARI', provincia: 'BA' },
  'B354': { nome: 'BOLOGNA', provincia: 'BO' },
  'C351': { nome: 'CATANIA', provincia: 'CT' },
  'D612': { nome: 'FIRENZE', provincia: 'FI' },
  'E625': { nome: 'GENOVA', provincia: 'GE' },
  'F205': { nome: 'MILANO', provincia: 'MI' },
  'F839': { nome: 'NAPOLI', provincia: 'NA' },
  'G273': { nome: 'PALERMO', provincia: 'PA' },
  'H501': { nome: 'ROMA', provincia: 'RM' },
  'L219': { nome: 'TORINO', provincia: 'TO' },
  'L736': { nome: 'VENEZIA', provincia: 'VE' },
  'L781': { nome: 'VERONA', provincia: 'VR' },
  'A662': { nome: 'BELPASSO', provincia: 'CT' },
  // Aggiungi altri comuni secondo necessità
};

export interface CFValidationResult {
  isValid: boolean;
  isChecksumValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CFReverseResult {
  dataNascita: string | null; // YYYY-MM-DD
  luogoNascita: string | null;
  provinciaNascita: string | null;
  codiceCatastale: string | null;
  sesso: 'M' | 'F' | null;
  annoNascita: number | null;
  meseNascita: number | null;
  giornoNascita: number | null;
}

/**
 * Normalizza il codice fiscale (maiuscolo, rimuove spazi)
 */
export function normalizzaCF(cf: string): string {
  return cf.toUpperCase().replace(/\s/g, '');
}

/**
 * Decodifica omocodia (sostituisce lettere con cifre nelle posizioni numeriche)
 */
function decodificaOmocodia(cf: string): string {
  const posizioni = [6, 7, 9, 10, 12, 13, 14]; // Posizioni che possono essere omocodiche
  let result = cf.split('');
  
  for (const pos of posizioni) {
    if (OMOCODIA_CIFRE[result[pos]]) {
      result[pos] = OMOCODIA_CIFRE[result[pos]];
    }
  }
  
  return result.join('');
}

/**
 * Calcola il carattere di controllo del codice fiscale
 */
export function calcolaCarattereControllo(cf: string): string {
  const cfSenzaControllo = cf.substring(0, 15).toUpperCase();
  let somma = 0;
  
  for (let i = 0; i < 15; i++) {
    const char = cfSenzaControllo[i];
    if ((i + 1) % 2 === 0) {
      // Posizione pari (1-indexed)
      somma += VALORI_PARI[char] || 0;
    } else {
      // Posizione dispari (1-indexed)
      somma += VALORI_DISPARI[char] || 0;
    }
  }
  
  return CARATTERI_CONTROLLO[somma % 26];
}

/**
 * Valida il formato del codice fiscale
 */
export function validaFormato(cf: string): boolean {
  // Pattern base: 6 lettere + 2 alfanumerici + 1 lettera + 2 alfanumerici + 1 lettera + 3 alfanumerici + 1 lettera
  const pattern = /^[A-Z]{6}[A-Z0-9]{2}[A-Z][A-Z0-9]{2}[A-Z][A-Z0-9]{3}[A-Z]$/;
  return pattern.test(cf);
}

/**
 * Valida il checksum del codice fiscale
 */
export function validaChecksum(cf: string): boolean {
  if (cf.length !== 16) return false;
  const carattereCalcolato = calcolaCarattereControllo(cf);
  return cf[15] === carattereCalcolato;
}

/**
 * Validazione completa del codice fiscale
 */
export function validaCF(cf: string): CFValidationResult {
  const result: CFValidationResult = {
    isValid: false,
    isChecksumValid: false,
    errors: [],
    warnings: []
  };
  
  if (!cf) {
    result.errors.push('Codice fiscale mancante');
    return result;
  }
  
  const cfNorm = normalizzaCF(cf);
  
  if (cfNorm.length !== 16) {
    result.errors.push(`Lunghezza non valida: ${cfNorm.length} caratteri (richiesti 16)`);
    return result;
  }
  
  if (!validaFormato(cfNorm)) {
    result.errors.push('Formato non valido');
    return result;
  }
  
  // Verifica checksum
  result.isChecksumValid = validaChecksum(cfNorm);
  if (!result.isChecksumValid) {
    result.warnings.push('Attenzione: checksum non valido');
  }
  
  // Verifica omocodia
  const cfDecodificato = decodificaOmocodia(cfNorm);
  if (cfDecodificato !== cfNorm) {
    result.warnings.push('Codice fiscale con omocodia rilevata');
  }
  
  // Se arriviamo qui, il formato è valido
  result.isValid = true;
  
  return result;
}

/**
 * Reverse engineering del codice fiscale
 * Estrae data di nascita, luogo di nascita e sesso
 */
export function reverseCF(cf: string): CFReverseResult {
  const result: CFReverseResult = {
    dataNascita: null,
    luogoNascita: null,
    provinciaNascita: null,
    codiceCatastale: null,
    sesso: null,
    annoNascita: null,
    meseNascita: null,
    giornoNascita: null
  };
  
  if (!cf || cf.length !== 16) {
    return result;
  }
  
  const cfNorm = normalizzaCF(cf);
  const cfDecodificato = decodificaOmocodia(cfNorm);
  
  try {
    // Estrai anno (posizioni 6-7)
    let anno = parseInt(cfDecodificato.substring(6, 8));
    // Assumiamo che se l'anno è > 30, sia 1900, altrimenti 2000
    // Questo è un'euristica comune, da adattare se necessario
    const annoCorrente = new Date().getFullYear() % 100;
    if (anno > annoCorrente + 5) {
      anno += 1900;
    } else {
      anno += 2000;
    }
    result.annoNascita = anno;
    
    // Estrai mese (posizione 8)
    const letteraMese = cfNorm[8];
    result.meseNascita = MESI[letteraMese] || null;
    
    // Estrai giorno (posizioni 9-10) e sesso
    let giorno = parseInt(cfDecodificato.substring(9, 11));
    if (giorno > 40) {
      result.sesso = 'F';
      giorno -= 40;
    } else {
      result.sesso = 'M';
    }
    result.giornoNascita = giorno;
    
    // Costruisci data di nascita
    if (result.annoNascita && result.meseNascita && result.giornoNascita) {
      const mese = result.meseNascita.toString().padStart(2, '0');
      const giornoStr = result.giornoNascita.toString().padStart(2, '0');
      result.dataNascita = `${result.annoNascita}-${mese}-${giornoStr}`;
    }
    
    // Estrai codice catastale (posizioni 11-14)
    result.codiceCatastale = cfNorm.substring(11, 15);
    
    // Cerca il comune nel database
    const comune = COMUNI_CATASTALI[result.codiceCatastale];
    if (comune) {
      result.luogoNascita = comune.nome;
      result.provinciaNascita = comune.provincia;
    } else {
      // Se non trovato, restituisci solo il codice
      result.luogoNascita = `Codice: ${result.codiceCatastale}`;
    }
    
  } catch (error) {
    console.error('Errore nel reverse engineering CF:', error);
  }
  
  return result;
}

/**
 * Formatta la data di nascita in formato italiano
 */
export function formattaDataNascita(data: string | null): string {
  if (!data) return '';
  const [anno, mese, giorno] = data.split('-');
  return `${giorno}/${mese}/${anno}`;
}

/**
 * Genera le prime 6 lettere del CF da cognome e nome
 * Utile per la validazione incrociata
 */
export function generaConsonantiVocali(cognome: string, nome: string): string {
  const estraiConsonanti = (str: string): string => {
    return str.toUpperCase().replace(/[^A-Z]/g, '').replace(/[AEIOU]/g, '');
  };
  
  const estraiVocali = (str: string): string => {
    return str.toUpperCase().replace(/[^A-Z]/g, '').replace(/[^AEIOU]/g, '');
  };
  
  const generaCodice = (str: string, isNome: boolean): string => {
    const consonanti = estraiConsonanti(str);
    const vocali = estraiVocali(str);
    
    if (isNome && consonanti.length > 3) {
      // Per il nome, se ci sono più di 3 consonanti, prendi 1a, 3a e 4a
      return consonanti[0] + consonanti[2] + consonanti[3];
    }
    
    let codice = consonanti + vocali;
    codice = (codice + 'XXX').substring(0, 3);
    return codice;
  };
  
  return generaCodice(cognome, false) + generaCodice(nome, true);
}

/**
 * Verifica se il CF corrisponde a cognome e nome forniti
 */
export function verificaCorrispondenza(cf: string, cognome: string, nome: string): boolean {
  if (!cf || cf.length !== 16 || !cognome || !nome) return false;
  
  const cfNorm = normalizzaCF(cf);
  const codiceGenerato = generaConsonantiVocali(cognome, nome);
  
  return cfNorm.substring(0, 6) === codiceGenerato;
}

export default {
  normalizzaCF,
  validaCF,
  validaChecksum,
  reverseCF,
  formattaDataNascita,
  generaConsonantiVocali,
  verificaCorrispondenza,
  calcolaCarattereControllo
};
