import * as XLSX from 'xlsx';

/**
 * Template Excel per Importazione Massiva
 * 
 * Genera template Excel con intestazioni, formattazione e dati di esempio.
 */

interface TemplateConfig {
  sheetName: string;
  headers: string[];
  exampleData: string[][];
  columnWidths: number[];
  notes: string[];
}

const COMPANY_TEMPLATE: TemplateConfig = {
  sheetName: 'Aziende',
  headers: [
    'Nome Azienda*',
    'P.IVA',
    'Codice Fiscale',
    'Indirizzo',
    'Città',
    'Provincia',
    'CAP',
    'Paese',
    'Telefono',
    'Email',
    'PEC',
    'Codice SDI',
    'Note',
  ],
  exampleData: [
    ['1', '12345678901', 'Via Roma 1', 'Milano', 'MI', '20100', 'Italia', '+39 02 1234567', 'info@esempio.it', 'esempio@pec.it', 'ABC1234', 'Azienda di esempio'],
    ['2', '98765432109', 'Via Verdi 10', 'Roma', 'RM', '00100', 'Italia', '+39 06 7654321', 'info@test.it', 'test@pec.it', 'XYZ7890', ''],
  ],
  columnWidths: [25, 15, 18, 30, 15, 8, 8, 10, 18, 25, 25, 10, 30],
  notes: [
    '* Campi obbligatori',
    '',
    'ISTRUZIONI:',
    '1. Compila i dati partendo dalla riga 2 (la riga 1 contiene le intestazioni)',
    '2. Il Nome Azienda è obbligatorio',
    '3. La P.IVA deve essere di 11 cifre (senza prefisso IT)',
    '4. Il Codice Fiscale può essere di 11 cifre (aziende) o 16 caratteri (persone)',
    '5. La Provincia deve essere di 2 lettere (es. MI, RM, TO)',
    '6. Il CAP deve essere di 5 cifre',
    '7. Il Codice SDI deve essere di 6-7 caratteri alfanumerici',
    '',
    'VALIDAZIONI:',
    '- P.IVA e Codice Fiscale devono essere univoci',
    '- Le email duplicate generano un avvertimento',
    '- I duplicati nel database vengono segnalati e saltati',
  ],
};

const STUDENT_TEMPLATE: TemplateConfig = {
  sheetName: 'Studenti',
  headers: [
    'Nome*',
    'Cognome*',
    'Email',
    'Telefono',
    'Codice Fiscale',
    'Data Nascita',
    'Luogo Nascita',
    'Indirizzo',
    'Città',
    'Provincia',
    'CAP',
    'Paese',
    'ID Azienda*',
    
    'Note',
  ],
  exampleData: [
    ['Mario', 'Rossi', 'mario.rossi@email.it', '+39 333 1234567', 'RSSMRA80A01H501Z', '01/01/1980', 'Roma', 'Via Roma 1', 'Milano', 'MI', '20100', 'Italia', '1', 'Studente di esempio'],
    ['Laura', 'Bianchi', 'laura.bianchi@email.it', '+39 333 7654321', 'BNCLRA85B41F205X', '01/02/1985', 'Milano', 'Via Verdi 10', 'Roma', 'RM', '00100', 'Italia', '2', ''],
  ],
  columnWidths: [15, 15, 25, 18, 18, 12, 15, 30, 15, 8, 8, 10, 12, 30],
  notes: [
    '* Campi obbligatori',
    '',
    'ISTRUZIONI:',
    '1. Compila i dati partendo dalla riga 2',
    '2. Nome e Cognome sono obbligatori',
    '3. Il Codice Fiscale deve essere di 16 caratteri (formato italiano)',
    '4. La Data di Nascita può essere in formato DD/MM/YYYY o YYYY-MM-DD',
    '5. Se specifichi Nome Azienda o P.IVA Azienda:',
    '   - Se l\'azienda esiste nel database, lo studente viene associato',
    '   - Se l\'azienda non esiste, viene creata automaticamente',
    '',
    'VALIDAZIONI:',
    '- Codice Fiscale ed Email devono essere univoci',
    '- I duplicati nel database vengono segnalati e saltati',
    '- Le aziende non esistenti vengono create automaticamente',
  ],
};

const INSTRUCTOR_TEMPLATE: TemplateConfig = {
  sheetName: 'Docenti',
  headers: [
    'Nome*',
    'Cognome*',
    'Email',
    'Telefono',
    'Codice Fiscale',
    'P.IVA',
    'Specializzazione',
    'Tariffa Oraria (€)',
    'Indirizzo',
    'Città',
    'Provincia',
    'CAP',
    'Paese',
    'IBAN',
    'Note',
  ],
  exampleData: [
    ['Giuseppe', 'Verdi', 'giuseppe.verdi@email.it', '+39 333 1111111', 'VRDGPP70C15H501Y', '12345678901', 'Sicurezza sul lavoro', '50', 'Via Roma 1', 'Milano', 'MI', '20100', 'Italia', 'IT60X0542811101000000123456', 'Docente senior'],
    ['Anna', 'Neri', 'anna.neri@email.it', '+39 333 2222222', 'NRANNA75D55F205W', '98765432109', 'Antincendio', '45', 'Via Verdi 10', 'Roma', 'RM', '00100', 'Italia', 'IT60X0542811101000000654321', ''],
  ],
  columnWidths: [15, 15, 25, 18, 18, 15, 25, 15, 30, 15, 8, 8, 10, 30, 30],
  notes: [
    '* Campi obbligatori',
    '',
    'ISTRUZIONI:',
    '1. Compila i dati partendo dalla riga 2',
    '2. Nome e Cognome sono obbligatori',
    '3. Il Codice Fiscale deve essere di 16 caratteri',
    '4. La P.IVA deve essere di 11 cifre',
    '5. La Tariffa Oraria deve essere un numero (es. 50 o 50.00)',
    '6. L\'IBAN deve essere in formato italiano (27 caratteri)',
    '',
    'VALIDAZIONI:',
    '- Codice Fiscale, P.IVA ed Email devono essere univoci',
    '- I duplicati nel database vengono segnalati e saltati',
    '- Tariffe orarie non valide generano un errore',
  ],
};

/**
 * Genera un template Excel con dati di esempio e note
 */
function generateTemplate(config: TemplateConfig): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  
  // Foglio principale con dati
  const wsData = [config.headers, ...config.exampleData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Imposta larghezza colonne
  ws['!cols'] = config.columnWidths.map(w => ({ wch: w }));
  
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
  
  // Foglio istruzioni
  const notesWs = XLSX.utils.aoa_to_sheet(config.notes.map(n => [n]));
  notesWs['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, notesWs, 'Istruzioni');
  
  return wb;
}

/**
 * Scarica template Aziende
 */
export function downloadCompanyTemplate(): void {
  const wb = generateTemplate(COMPANY_TEMPLATE);
  XLSX.writeFile(wb, 'Template_Importazione_Aziende.xlsx');
}

/**
 * Scarica template Studenti
 */
export function downloadStudentTemplate(): void {
  const wb = generateTemplate(STUDENT_TEMPLATE);
  XLSX.writeFile(wb, 'Template_Importazione_Studenti.xlsx');
}

/**
 * Scarica template Docenti
 */
export function downloadInstructorTemplate(): void {
  const wb = generateTemplate(INSTRUCTOR_TEMPLATE);
  XLSX.writeFile(wb, 'Template_Importazione_Docenti.xlsx');
}

/**
 * Scarica tutti i template in un unico file
 */
export function downloadAllTemplates(): void {
  const wb = XLSX.utils.book_new();
  
  // Aziende
  const companyWs = XLSX.utils.aoa_to_sheet([COMPANY_TEMPLATE.headers, ...COMPANY_TEMPLATE.exampleData]);
  companyWs['!cols'] = COMPANY_TEMPLATE.columnWidths.map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, companyWs, 'Aziende');
  
  // Studenti
  const studentWs = XLSX.utils.aoa_to_sheet([STUDENT_TEMPLATE.headers, ...STUDENT_TEMPLATE.exampleData]);
  studentWs['!cols'] = STUDENT_TEMPLATE.columnWidths.map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, studentWs, 'Studenti');
  
  // Docenti
  const instructorWs = XLSX.utils.aoa_to_sheet([INSTRUCTOR_TEMPLATE.headers, ...INSTRUCTOR_TEMPLATE.exampleData]);
  instructorWs['!cols'] = INSTRUCTOR_TEMPLATE.columnWidths.map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, instructorWs, 'Docenti');
  
  // Istruzioni generali
  const allNotes = [
    ['ISTRUZIONI GENERALI PER L\'IMPORTAZIONE'],
    [''],
    ['Questo file contiene 3 fogli per importare:'],
    ['- Aziende: dati anagrafici e fiscali delle aziende clienti'],
    ['- Studenti: dati anagrafici degli studenti con associazione azienda'],
    ['- Docenti: dati anagrafici e professionali dei docenti'],
    [''],
    ['PROCEDURA:'],
    ['1. Compila il foglio desiderato con i tuoi dati'],
    ['2. Salva il file Excel'],
    ['3. Vai alla pagina Importazione nel gestionale'],
    ['4. Seleziona il tipo di importazione'],
    ['5. Carica il file Excel'],
    ['6. Verifica la preview e correggi eventuali errori'],
    ['7. Conferma l\'importazione'],
    [''],
    ['NOTE IMPORTANTI:'],
    ['- I campi con * sono obbligatori'],
    ['- I duplicati (P.IVA, CF, Email) vengono segnalati e saltati'],
    ['- Puoi importare fino a 1000 righe per volta'],
    ['- Le righe con errori vengono saltate, le altre importate'],
    [''],
    ...COMPANY_TEMPLATE.notes.map(n => [n]),
    [''],
    ...STUDENT_TEMPLATE.notes.map(n => [n]),
    [''],
    ...INSTRUCTOR_TEMPLATE.notes.map(n => [n]),
  ];
  
  const notesWs = XLSX.utils.aoa_to_sheet(allNotes);
  notesWs['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, notesWs, 'Istruzioni');
  
  XLSX.writeFile(wb, 'Template_Importazione_Completo.xlsx');
}

export default {
  downloadCompanyTemplate,
  downloadStudentTemplate,
  downloadInstructorTemplate,
  downloadAllTemplates,
};
