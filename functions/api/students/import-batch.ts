import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, or, and } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

interface StudentRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  taxCode?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  companyId?: string | number; // ID dell'azienda (obbligatorio)
  notes?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value?: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    value?: string;
  }>;
  duplicates: Array<{
    row: number;
    field: string;
    existingId: number;
    existingName: string;
    value: string;
  }>;
}

// Validazione Codice Fiscale persone fisiche
function validateTaxCode(taxCode: string): boolean {
  if (!taxCode) return true;
  const cleaned = taxCode.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cleaned)) {
    return false;
  }
  return true;
}

// Validazione email
function validateEmail(email: string): boolean {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validazione telefono
function validatePhone(phone: string): boolean {
  if (!phone) return true;
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  return /^[\+]?[\d]{6,15}$/.test(cleaned);
}

// Validazione data
function validateDate(dateStr: string): boolean {
  if (!dateStr) return true;
  // Supporta formati: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const formats = [
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}-\d{2}-\d{4}$/,
  ];
  return formats.some(f => f.test(dateStr));
}

// Converti data in formato ISO
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  }
  
  // YYYY-MM-DD (già in formato ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  return null;
}

// Validazione CAP
function validatePostalCode(postalCode: string): boolean {
  if (!postalCode) return true;
  return /^\d{5}$/.test(postalCode);
}

// Validazione provincia
function validateProvince(province: string): boolean {
  if (!province) return true;
  return /^[A-Z]{2}$/i.test(province);
}

// Validazione P.IVA
function validateVatNumber(vatNumber: string): boolean {
  if (!vatNumber) return true;
  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
  const vat = cleaned.startsWith('IT') ? cleaned.slice(2) : cleaned;
  if (!/^\d{11}$/.test(vat)) return false;
  
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let digit = parseInt(vat[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

app.post('/', async (c) => {
  try {
    const clientId = c.get('clientId' as never) as number;
    if (!clientId) {
      return c.json({ error: 'Non autorizzato' }, 401);
    }

    const body = await c.req.json();
    const { rows, dryRun = false } = body as { rows: StudentRow[]; dryRun?: boolean };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return c.json({ error: 'Nessun dato da importare' }, 400);
    }

    if (rows.length > 1000) {
      return c.json({ error: 'Massimo 1000 righe per importazione' }, 400);
    }

    const db = drizzle(c.env.DB, { schema });
    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      duplicates: [],
    };

    // Cerca studenti esistenti per controllo duplicati
    const existingStudents = await db.select({
      id: schema.students.id,
      firstName: schema.students.firstName,
      lastName: schema.students.lastName,
      email: schema.students.email,
      taxCode: schema.students.taxCode,
    })
    .from(schema.students)
    .where(eq(schema.students.clientId, clientId));

    const existingTaxMap = new Map<string, { id: number; name: string }>();
    const existingEmailMap = new Map<string, { id: number; name: string }>();

    for (const student of existingStudents) {
      const fullName = `${student.firstName} ${student.lastName}`;
      if (student.taxCode) {
        existingTaxMap.set(student.taxCode.toUpperCase(), { id: student.id, name: fullName });
      }
      if (student.email) {
        existingEmailMap.set(student.email.toLowerCase(), { id: student.id, name: fullName });
      }
    }

    // Cerca aziende esistenti
    const existingCompanies = await db.select({
      id: schema.companies.id,
      name: schema.companies.name,
      vatNumber: schema.companies.vatNumber,
    })
    .from(schema.companies)
    .where(eq(schema.companies.clientId, clientId));

    const companyByName = new Map<string, number>();
    const companyByVat = new Map<string, number>();

    for (const company of existingCompanies) {
      companyByName.set(company.name.toLowerCase(), company.id);
      if (company.vatNumber) {
        companyByVat.set(company.vatNumber.toUpperCase(), company.id);
      }
    }

    // Controlla duplicati all'interno del file stesso
    const fileTaxSet = new Set<string>();
    const fileEmailSet = new Set<string>();

    const validRows: Array<{ index: number; data: StudentRow; companyId: number | null }> = [];
    const companiesToCreate = new Map<string, string>(); // name -> vatNumber

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      let hasError = false;

      // Validazione nome (obbligatorio)
      if (!row.firstName || row.firstName.trim() === '') {
        result.errors.push({
          row: rowNum,
          field: 'firstName',
          message: 'Il nome è obbligatorio',
        });
        hasError = true;
      }

      // Validazione cognome (obbligatorio)
      if (!row.lastName || row.lastName.trim() === '') {
        result.errors.push({
          row: rowNum,
          field: 'lastName',
          message: 'Il cognome è obbligatorio',
        });
        hasError = true;
      }

      // Validazione Codice Fiscale
      const taxCode = row.taxCode?.trim().toUpperCase();
      if (taxCode) {
        if (!validateTaxCode(taxCode)) {
          result.errors.push({
            row: rowNum,
            field: 'taxCode',
            message: 'Codice Fiscale non valido',
            value: taxCode,
          });
          hasError = true;
        } else {
          // Controllo duplicato nel database
          const existing = existingTaxMap.get(taxCode);
          if (existing) {
            result.duplicates.push({
              row: rowNum,
              field: 'taxCode',
              existingId: existing.id,
              existingName: existing.name,
              value: taxCode,
            });
            hasError = true;
          }
          // Controllo duplicato nel file
          if (fileTaxSet.has(taxCode)) {
            result.errors.push({
              row: rowNum,
              field: 'taxCode',
              message: 'Codice Fiscale duplicato nel file',
              value: taxCode,
            });
            hasError = true;
          }
          fileTaxSet.add(taxCode);
        }
      }

      // Validazione Email
      const email = row.email?.trim().toLowerCase();
      if (email) {
        if (!validateEmail(email)) {
          result.errors.push({
            row: rowNum,
            field: 'email',
            message: 'Email non valida',
            value: email,
          });
          hasError = true;
        } else {
          // Controllo duplicato nel database
          const existing = existingEmailMap.get(email);
          if (existing) {
            result.duplicates.push({
              row: rowNum,
              field: 'email',
              existingId: existing.id,
              existingName: existing.name,
              value: email,
            });
            hasError = true;
          }
          // Controllo duplicato nel file
          if (fileEmailSet.has(email)) {
            result.errors.push({
              row: rowNum,
              field: 'email',
              message: 'Email duplicata nel file',
              value: email,
            });
            hasError = true;
          }
          fileEmailSet.add(email);
        }
      }

      // Validazione telefono
      if (row.phone && !validatePhone(row.phone)) {
        result.warnings.push({
          row: rowNum,
          field: 'phone',
          message: 'Formato telefono non standard',
          value: row.phone,
        });
      }

      // Validazione data di nascita
      if (row.birthDate && !validateDate(row.birthDate)) {
        result.errors.push({
          row: rowNum,
          field: 'birthDate',
          message: 'Formato data non valido (usare DD/MM/YYYY o YYYY-MM-DD)',
          value: row.birthDate,
        });
        hasError = true;
      }

      // Validazione CAP
      if (row.postalCode && !validatePostalCode(row.postalCode)) {
        result.warnings.push({
          row: rowNum,
          field: 'postalCode',
          message: 'CAP non valido (deve essere 5 cifre)',
          value: row.postalCode,
        });
      }

      // Validazione provincia
      if (row.province && !validateProvince(row.province)) {
        result.warnings.push({
          row: rowNum,
          field: 'province',
          message: 'Provincia non valida (deve essere 2 lettere)',
          value: row.province,
        });
      }

      // Validazione azienda (obbligatoria)
      const companyIdStr = row.companyId?.toString().trim();
      let companyId: number | null = null;

      if (!companyIdStr) {
        result.errors.push({
          row: rowNum,
          field: 'companyId',
          message: 'L\'azienda è obbligatoria',
        });
        hasError = true;
      } else {
        const companyIdNum = parseInt(companyIdStr, 10);
        if (isNaN(companyIdNum)) {
          result.errors.push({
            row: rowNum,
            field: 'companyId',
            message: 'ID azienda non valido (deve essere un numero)',
            value: companyIdStr,
          });
          hasError = true;
        } else {
          // Verifica che l'azienda esista
          const companyExists = existingCompanies.some(c => c.id === companyIdNum);
          if (!companyExists) {
            result.errors.push({
              row: rowNum,
              field: 'companyId',
              message: `Azienda con ID ${companyIdNum} non trovata`,
              value: companyIdStr,
            });
            hasError = true;
          } else {
            companyId = companyIdNum;
          }
        }
      }

      if (!hasError) {
        validRows.push({ index: i, data: row, companyId });
      } else {
        result.skipped++;
      }
    }

    // Se è solo una verifica (dry run), restituisci i risultati senza importare
    if (dryRun) {
      result.imported = validRows.length;
      result.companiesCreated = companiesToCreate.size;
      return c.json(result);
    }

    // Non creiamo più aziende automaticamente

    // Importa gli studenti
    for (const { data: row, companyId: existingCompanyId } of validRows) {
      try {
        await db.insert(schema.students).values({
          clientId,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email?.trim().toLowerCase() || null,
          phone: row.phone?.trim() || null,
          taxCode: row.taxCode?.trim().toUpperCase() || null,
          birthDate: parseDate(row.birthDate || '') || null,
          birthPlace: row.birthPlace?.trim() || null,
          address: row.address?.trim() || null,
          city: row.city?.trim() || null,
          province: row.province?.trim().toUpperCase() || null,
          postalCode: row.postalCode?.trim() || null,
          country: row.country?.trim() || 'Italia',
          companyId: existingCompanyId,
          notes: row.notes?.trim() || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        result.imported++;
      } catch (err: any) {
        result.errors.push({
          row: validRows.indexOf({ index: 0, data: row, companyId: null }) + 2,
          field: 'database',
          message: err.message || 'Errore durante l\'inserimento',
        });
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0 && result.duplicates.length === 0;
    return c.json(result);
  } catch (error: any) {
    console.error('Error importing students:', error);
    return c.json({ error: error.message || 'Errore durante l\'importazione' }, 500);
  }
});

export default app;
