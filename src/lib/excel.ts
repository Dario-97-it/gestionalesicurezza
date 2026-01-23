/**
 * Utility per Export/Import Excel
 * Usa xlsx.js per generazione client-side
 */

import * as XLSX from 'xlsx';

// ============================================
// EXPORT FUNCTIONS
// ============================================

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

/**
 * Esporta un array di oggetti in un file Excel
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string; width?: number }[],
  options: ExportOptions
): void {
  // Prepara i dati con le intestazioni
  const headers = columns.map(col => col.header);
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      // Formatta date
      if (value instanceof Date) {
        return value.toLocaleDateString('it-IT');
      }
      // Formatta booleani
      if (typeof value === 'boolean') {
        return value ? 'Sì' : 'No';
      }
      return value ?? '';
    })
  );

  // Crea il worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Imposta le larghezze delle colonne
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  // Crea il workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Dati');

  // Genera e scarica il file
  XLSX.writeFile(wb, `${options.filename}.xlsx`);
}

/**
 * Esporta studenti in Excel
 */
export function exportStudents(students: any[]): void {
  exportToExcel(students, [
    { key: 'firstName', header: 'Nome', width: 15 },
    { key: 'lastName', header: 'Cognome', width: 15 },
    { key: 'fiscalCode', header: 'Codice Fiscale', width: 18 },
    { key: 'email', header: 'Email', width: 25 },
    { key: 'phone', header: 'Telefono', width: 15 },
    { key: 'birthDate', header: 'Data Nascita', width: 12 },
    { key: 'birthPlace', header: 'Luogo Nascita', width: 15 },
    { key: 'address', header: 'Indirizzo', width: 30 },
    { key: 'companyName', header: 'Azienda', width: 25 },
  ], {
    filename: `studenti_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Studenti'
  });
}

/**
 * Esporta aziende in Excel
 */
export function exportCompanies(companies: any[]): void {
  exportToExcel(companies, [
    { key: 'name', header: 'Ragione Sociale', width: 30 },
    { key: 'vatNumber', header: 'Partita IVA', width: 15 },
    { key: 'email', header: 'Email', width: 25 },
    { key: 'phone', header: 'Telefono', width: 15 },
    { key: 'address', header: 'Indirizzo', width: 30 },
    { key: 'contactPerson', header: 'Referente', width: 20 },
  ], {
    filename: `aziende_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Aziende'
  });
}

/**
 * Esporta corsi in Excel
 */
export function exportCourses(courses: any[]): void {
  exportToExcel(courses, [
    { key: 'code', header: 'Codice', width: 12 },
    { key: 'title', header: 'Titolo', width: 35 },
    { key: 'type', header: 'Tipo', width: 15 },
    { key: 'duration', header: 'Durata (ore)', width: 12 },
    { key: 'price', header: 'Prezzo (€)', width: 12 },
    { key: 'validityMonths', header: 'Validità (mesi)', width: 15 },
    { key: 'isActive', header: 'Attivo', width: 10 },
  ], {
    filename: `corsi_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Corsi'
  });
}

/**
 * Esporta edizioni in Excel
 */
export function exportEditions(editions: any[]): void {
  exportToExcel(editions, [
    { key: 'courseName', header: 'Corso', width: 30 },
    { key: 'startDate', header: 'Data Inizio', width: 12 },
    { key: 'endDate', header: 'Data Fine', width: 12 },
    { key: 'location', header: 'Luogo', width: 20 },
    { key: 'maxParticipants', header: 'Max Partecipanti', width: 15 },
    { key: 'status', header: 'Stato', width: 12 },
    { key: 'instructorName', header: 'Docente', width: 20 },
  ], {
    filename: `edizioni_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Edizioni'
  });
}

/**
 * Esporta iscrizioni in Excel
 */
export function exportRegistrations(registrations: any[]): void {
  exportToExcel(registrations, [
    { key: 'studentName', header: 'Studente', width: 25 },
    { key: 'courseName', header: 'Corso', width: 30 },
    { key: 'editionDate', header: 'Data Edizione', width: 12 },
    { key: 'companyName', header: 'Azienda', width: 25 },
    { key: 'status', header: 'Stato', width: 12 },
    { key: 'appliedPrice', header: 'Prezzo (€)', width: 12 },
    { key: 'registrationDate', header: 'Data Iscrizione', width: 15 },
  ], {
    filename: `iscrizioni_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Iscrizioni'
  });
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ImportError[];
  warnings: ImportWarning[];
  totalRows: number;
  validRows: number;
  duplicates: number;
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
  value: any;
}

export interface ImportWarning {
  row: number;
  column: string;
  message: string;
  value: any;
}

interface ColumnMapping {
  excelHeader: string;
  dbField: string;
  required?: boolean;
  transform?: (value: any) => any;
  validate?: (value: any) => { valid: boolean; message?: string };
}

/**
 * Legge un file Excel e restituisce i dati come array di oggetti
 */
export async function readExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Importa studenti da Excel
 */
export async function importStudents(
  file: File,
  existingFiscalCodes: Set<string>
): Promise<ImportResult<any>> {
  const result: ImportResult<any> = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
    totalRows: 0,
    validRows: 0,
    duplicates: 0
  };

  try {
    const rows = await readExcelFile(file);
    if (rows.length < 2) {
      result.errors.push({ row: 0, column: '', message: 'File vuoto o senza dati', value: null });
      return result;
    }

    const headers = rows[0].map(h => String(h).toLowerCase().trim());
    result.totalRows = rows.length - 1;

    // Mapping colonne
    const columnMap: Record<string, string> = {
      'nome': 'firstName',
      'cognome': 'lastName',
      'codice fiscale': 'fiscalCode',
      'cf': 'fiscalCode',
      'email': 'email',
      'telefono': 'phone',
      'tel': 'phone',
      'data nascita': 'birthDate',
      'data di nascita': 'birthDate',
      'luogo nascita': 'birthPlace',
      'luogo di nascita': 'birthPlace',
      'indirizzo': 'address',
      'azienda': 'companyName',
    };

    // Trova gli indici delle colonne
    const columnIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      const mappedField = columnMap[header];
      if (mappedField) {
        columnIndices[mappedField] = index;
      }
    });

    // Verifica colonne obbligatorie
    if (!('firstName' in columnIndices) || !('lastName' in columnIndices)) {
      result.errors.push({ 
        row: 0, 
        column: '', 
        message: 'Colonne obbligatorie mancanti: Nome e Cognome', 
        value: null 
      });
      return result;
    }

    // Processa le righe
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(cell => !cell)) continue;

      const student: any = {};
      let hasError = false;

      // Estrai i valori
      for (const [field, index] of Object.entries(columnIndices)) {
        let value = row[index];
        
        // Trasforma i valori
        if (field === 'fiscalCode' && value) {
          value = String(value).toUpperCase().replace(/\s/g, '');
        }
        if (field === 'birthDate' && value) {
          // Prova a parsare la data
          if (typeof value === 'number') {
            // Excel date serial number
            const date = XLSX.SSF.parse_date_code(value);
            value = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          } else if (typeof value === 'string') {
            // Prova formati comuni
            const dateMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            if (dateMatch) {
              const [, d, m, y] = dateMatch;
              const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y;
              value = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
          }
        }
        
        student[field] = value || null;
      }

      // Validazioni
      if (!student.firstName || !student.lastName) {
        result.errors.push({
          row: i + 1,
          column: 'Nome/Cognome',
          message: 'Nome e cognome sono obbligatori',
          value: `${student.firstName || ''} ${student.lastName || ''}`
        });
        hasError = true;
      }

      // Controllo duplicati CF
      if (student.fiscalCode) {
        if (existingFiscalCodes.has(student.fiscalCode)) {
          result.warnings.push({
            row: i + 1,
            column: 'Codice Fiscale',
            message: 'Codice fiscale già presente nel database',
            value: student.fiscalCode
          });
          result.duplicates++;
        }
        existingFiscalCodes.add(student.fiscalCode);
      }

      if (!hasError) {
        result.data.push(student);
        result.validRows++;
      }
    }

    result.success = result.validRows > 0;
    return result;

  } catch (error: any) {
    result.errors.push({ row: 0, column: '', message: `Errore lettura file: ${error.message}`, value: null });
    return result;
  }
}

/**
 * Importa aziende da Excel
 */
export async function importCompanies(
  file: File,
  existingVatNumbers: Set<string>
): Promise<ImportResult<any>> {
  const result: ImportResult<any> = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
    totalRows: 0,
    validRows: 0,
    duplicates: 0
  };

  try {
    const rows = await readExcelFile(file);
    if (rows.length < 2) {
      result.errors.push({ row: 0, column: '', message: 'File vuoto o senza dati', value: null });
      return result;
    }

    const headers = rows[0].map(h => String(h).toLowerCase().trim());
    result.totalRows = rows.length - 1;

    // Mapping colonne
    const columnMap: Record<string, string> = {
      'ragione sociale': 'name',
      'nome': 'name',
      'azienda': 'name',
      'partita iva': 'vatNumber',
      'p.iva': 'vatNumber',
      'piva': 'vatNumber',
      'email': 'email',
      'telefono': 'phone',
      'tel': 'phone',
      'indirizzo': 'address',
      'referente': 'contactPerson',
      'contatto': 'contactPerson',
    };

    // Trova gli indici delle colonne
    const columnIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      const mappedField = columnMap[header];
      if (mappedField) {
        columnIndices[mappedField] = index;
      }
    });

    // Verifica colonne obbligatorie
    if (!('name' in columnIndices)) {
      result.errors.push({ 
        row: 0, 
        column: '', 
        message: 'Colonna obbligatoria mancante: Ragione Sociale/Nome', 
        value: null 
      });
      return result;
    }

    // Processa le righe
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(cell => !cell)) continue;

      const company: any = {};
      let hasError = false;

      // Estrai i valori
      for (const [field, index] of Object.entries(columnIndices)) {
        let value = row[index];
        
        // Trasforma i valori
        if (field === 'vatNumber' && value) {
          value = String(value).replace(/\s/g, '').replace(/[^0-9]/g, '');
        }
        
        company[field] = value || null;
      }

      // Validazioni
      if (!company.name) {
        result.errors.push({
          row: i + 1,
          column: 'Ragione Sociale',
          message: 'Ragione sociale è obbligatoria',
          value: company.name
        });
        hasError = true;
      }

      // Controllo duplicati P.IVA
      if (company.vatNumber) {
        if (existingVatNumbers.has(company.vatNumber)) {
          result.warnings.push({
            row: i + 1,
            column: 'Partita IVA',
            message: 'Partita IVA già presente nel database',
            value: company.vatNumber
          });
          result.duplicates++;
        }
        existingVatNumbers.add(company.vatNumber);
      }

      if (!hasError) {
        result.data.push(company);
        result.validRows++;
      }
    }

    result.success = result.validRows > 0;
    return result;

  } catch (error: any) {
    result.errors.push({ row: 0, column: '', message: `Errore lettura file: ${error.message}`, value: null });
    return result;
  }
}

/**
 * Genera un template Excel per l'import
 */
export function downloadTemplate(type: 'students' | 'companies' | 'courses'): void {
  let headers: string[] = [];
  let sampleData: any[][] = [];
  let filename = '';

  switch (type) {
    case 'students':
      headers = ['Nome', 'Cognome', 'Codice Fiscale', 'Email', 'Telefono', 'Data Nascita', 'Luogo Nascita', 'Indirizzo', 'Azienda'];
      sampleData = [
        ['Mario', 'Rossi', 'RSSMRA80A01H501Z', 'mario.rossi@email.it', '3331234567', '01/01/1980', 'Roma', 'Via Roma 1', 'Azienda SRL'],
        ['Giulia', 'Bianchi', 'BNCGLI85B02F205X', 'giulia.bianchi@email.it', '3339876543', '02/02/1985', 'Milano', 'Via Milano 2', 'Altra Azienda SPA'],
      ];
      filename = 'template_studenti';
      break;
    case 'companies':
      headers = ['Ragione Sociale', 'Partita IVA', 'Email', 'Telefono', 'Indirizzo', 'Referente'];
      sampleData = [
        ['Azienda SRL', '12345678901', 'info@azienda.it', '0212345678', 'Via Esempio 1, Milano', 'Mario Rossi'],
        ['Altra Azienda SPA', '98765432109', 'info@altra.it', '0698765432', 'Via Test 2, Roma', 'Giulia Bianchi'],
      ];
      filename = 'template_aziende';
      break;
    case 'courses':
      headers = ['Codice', 'Titolo', 'Tipo', 'Durata (ore)', 'Prezzo', 'Validità (mesi)'];
      sampleData = [
        ['FORM-BASE', 'Formazione Base Lavoratori', 'base', '4', '50', '60'],
        ['FORM-SPEC', 'Formazione Specifica Rischio Alto', 'specifica', '12', '150', '60'],
      ];
      filename = 'template_corsi';
      break;
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
