import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

interface InstructorRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  taxCode?: string;
  vatNumber?: string;
  specialization?: string;
  hourlyRate?: string | number;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  iban?: string;
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

// Validazione Codice Fiscale
function validateTaxCode(taxCode: string): boolean {
  if (!taxCode) return true;
  const cleaned = taxCode.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cleaned)) {
    return false;
  }
  return true;
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

// Validazione IBAN
function validateIban(iban: string): boolean {
  if (!iban) return true;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  // IBAN italiano: IT + 2 cifre controllo + 1 lettera CIN + 5 cifre ABI + 5 cifre CAB + 12 caratteri conto
  if (!/^IT\d{2}[A-Z]\d{22}$/.test(cleaned)) {
    return false;
  }
  return true;
}

// Validazione tariffa oraria
function validateHourlyRate(rate: string | number): boolean {
  if (rate === undefined || rate === null || rate === '') return true;
  const numRate = typeof rate === 'string' ? parseFloat(rate.replace(',', '.')) : rate;
  return !isNaN(numRate) && numRate >= 0 && numRate <= 10000;
}

// Parse tariffa oraria
function parseHourlyRate(rate: string | number | undefined): number | null {
  if (rate === undefined || rate === null || rate === '') return null;
  const numRate = typeof rate === 'string' ? parseFloat(rate.replace(',', '.')) : rate;
  return isNaN(numRate) ? null : numRate;
}

app.post('/', async (c) => {
  try {
    const clientId = c.get('clientId' as never) as number;
    if (!clientId) {
      return c.json({ error: 'Non autorizzato' }, 401);
    }

    const body = await c.req.json();
    const { rows, dryRun = false } = body as { rows: InstructorRow[]; dryRun?: boolean };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return c.json({ error: 'Nessun dato da importare' }, 400);
    }

    if (rows.length > 500) {
      return c.json({ error: 'Massimo 500 righe per importazione' }, 400);
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

    // Cerca docenti esistenti per controllo duplicati
    const existingInstructors = await db.select({
      id: schema.instructors.id,
      firstName: schema.instructors.firstName,
      lastName: schema.instructors.lastName,
      email: schema.instructors.email,
      taxCode: schema.instructors.taxCode,
      vatNumber: schema.instructors.vatNumber,
    })
    .from(schema.instructors)
    .where(eq(schema.instructors.clientId, clientId));

    const existingTaxMap = new Map<string, { id: number; name: string }>();
    const existingVatMap = new Map<string, { id: number; name: string }>();
    const existingEmailMap = new Map<string, { id: number; name: string }>();

    for (const instructor of existingInstructors) {
      const fullName = `${instructor.firstName} ${instructor.lastName}`;
      if (instructor.taxCode) {
        existingTaxMap.set(instructor.taxCode.toUpperCase(), { id: instructor.id, name: fullName });
      }
      if (instructor.vatNumber) {
        existingVatMap.set(instructor.vatNumber.toUpperCase(), { id: instructor.id, name: fullName });
      }
      if (instructor.email) {
        existingEmailMap.set(instructor.email.toLowerCase(), { id: instructor.id, name: fullName });
      }
    }

    // Controlla duplicati all'interno del file stesso
    const fileTaxSet = new Set<string>();
    const fileVatSet = new Set<string>();
    const fileEmailSet = new Set<string>();

    const validRows: Array<{ index: number; data: InstructorRow }> = [];

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

      // Validazione P.IVA
      const vatNumber = row.vatNumber?.trim().toUpperCase();
      if (vatNumber) {
        if (!validateVatNumber(vatNumber)) {
          result.errors.push({
            row: rowNum,
            field: 'vatNumber',
            message: 'P.IVA non valida',
            value: vatNumber,
          });
          hasError = true;
        } else {
          // Controllo duplicato nel database
          const existing = existingVatMap.get(vatNumber);
          if (existing) {
            result.duplicates.push({
              row: rowNum,
              field: 'vatNumber',
              existingId: existing.id,
              existingName: existing.name,
              value: vatNumber,
            });
            hasError = true;
          }
          // Controllo duplicato nel file
          if (fileVatSet.has(vatNumber)) {
            result.errors.push({
              row: rowNum,
              field: 'vatNumber',
              message: 'P.IVA duplicata nel file',
              value: vatNumber,
            });
            hasError = true;
          }
          fileVatSet.add(vatNumber);
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

      // Validazione tariffa oraria
      if (row.hourlyRate !== undefined && row.hourlyRate !== '' && !validateHourlyRate(row.hourlyRate)) {
        result.errors.push({
          row: rowNum,
          field: 'hourlyRate',
          message: 'Tariffa oraria non valida (deve essere un numero positivo)',
          value: String(row.hourlyRate),
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

      // Validazione IBAN
      if (row.iban && !validateIban(row.iban)) {
        result.warnings.push({
          row: rowNum,
          field: 'iban',
          message: 'IBAN non valido (formato italiano atteso)',
          value: row.iban,
        });
      }

      if (!hasError) {
        validRows.push({ index: i, data: row });
      } else {
        result.skipped++;
      }
    }

    // Se è solo una verifica (dry run), restituisci i risultati senza importare
    if (dryRun) {
      result.imported = validRows.length;
      return c.json(result);
    }

    // Importa i docenti
    for (const { data: row } of validRows) {
      try {
        await db.insert(schema.instructors).values({
          clientId,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email?.trim().toLowerCase() || null,
          phone: row.phone?.trim() || null,
          taxCode: row.taxCode?.trim().toUpperCase() || null,
          vatNumber: row.vatNumber?.trim().toUpperCase() || null,
          specialization: row.specialization?.trim() || null,
          hourlyRate: parseHourlyRate(row.hourlyRate),
          address: row.address?.trim() || null,
          city: row.city?.trim() || null,
          province: row.province?.trim().toUpperCase() || null,
          postalCode: row.postalCode?.trim() || null,
          country: row.country?.trim() || 'Italia',
          iban: row.iban?.replace(/\s/g, '').toUpperCase() || null,
          notes: row.notes?.trim() || null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        result.imported++;
      } catch (err: any) {
        result.errors.push({
          row: validRows.indexOf({ index: 0, data: row }) + 2,
          field: 'database',
          message: err.message || 'Errore durante l\'inserimento',
        });
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0 && result.duplicates.length === 0;
    return c.json(result);
  } catch (error: any) {
    console.error('Error importing instructors:', error);
    return c.json({ error: error.message || 'Errore durante l\'importazione' }, 500);
  }
});

export default app;
