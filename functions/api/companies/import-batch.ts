import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, or, inArray } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

interface CompanyRow {
  name: string;
  vatNumber?: string;
  taxCode?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  pec?: string;
  sdiCode?: string;
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

// Validazione P.IVA italiana
function validateVatNumber(vatNumber: string): boolean {
  if (!vatNumber) return true;
  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
  // Rimuovi prefisso IT se presente
  const vat = cleaned.startsWith('IT') ? cleaned.slice(2) : cleaned;
  if (!/^\d{11}$/.test(vat)) return false;
  
  // Algoritmo di controllo P.IVA
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

// Validazione Codice Fiscale
function validateTaxCode(taxCode: string): boolean {
  if (!taxCode) return true;
  const cleaned = taxCode.replace(/\s/g, '').toUpperCase();
  // Codice fiscale persone fisiche: 16 caratteri alfanumerici
  // Codice fiscale aziende: 11 cifre (uguale a P.IVA)
  if (/^\d{11}$/.test(cleaned)) {
    return validateVatNumber(cleaned);
  }
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

// Validazione SDI
function validateSdiCode(sdiCode: string): boolean {
  if (!sdiCode) return true;
  return /^[A-Z0-9]{6,7}$/i.test(sdiCode);
}

// Validazione PEC
function validatePec(pec: string): boolean {
  if (!pec) return true;
  return validateEmail(pec);
}

app.post('/', async (c) => {
  try {
    const clientId = c.get('clientId' as never) as number;
    if (!clientId) {
      return c.json({ error: 'Non autorizzato' }, 401);
    }

    const body = await c.req.json();
    const { rows, dryRun = false } = body as { rows: CompanyRow[]; dryRun?: boolean };

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

    // Raccogli tutti i valori univoci per controllo duplicati
    const vatNumbers = rows.map(r => r.vatNumber?.trim().toUpperCase()).filter(Boolean) as string[];
    const taxCodes = rows.map(r => r.taxCode?.trim().toUpperCase()).filter(Boolean) as string[];
    const emails = rows.map(r => r.email?.trim().toLowerCase()).filter(Boolean) as string[];

    // Cerca duplicati nel database
    const existingCompanies = await db.select({
      id: schema.companies.id,
      name: schema.companies.name,
      vatNumber: schema.companies.vatNumber,
      taxCode: schema.companies.taxCode,
      email: schema.companies.email,
    })
    .from(schema.companies)
    .where(eq(schema.companies.clientId, clientId));

    const existingVatMap = new Map<string, { id: number; name: string }>();
    const existingTaxMap = new Map<string, { id: number; name: string }>();
    const existingEmailMap = new Map<string, { id: number; name: string }>();

    for (const company of existingCompanies) {
      if (company.vatNumber) {
        existingVatMap.set(company.vatNumber.toUpperCase(), { id: company.id, name: company.name });
      }
      if (company.taxCode) {
        existingTaxMap.set(company.taxCode.toUpperCase(), { id: company.id, name: company.name });
      }
      if (company.email) {
        existingEmailMap.set(company.email.toLowerCase(), { id: company.id, name: company.name });
      }
    }

    // Controlla duplicati all'interno del file stesso
    const fileVatSet = new Set<string>();
    const fileTaxSet = new Set<string>();
    const fileEmailSet = new Set<string>();

    const validRows: Array<{ index: number; data: CompanyRow }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 perché Excel inizia da 1 e la prima riga è l'header
      let hasError = false;

      // Validazione nome (obbligatorio)
      if (!row.name || row.name.trim() === '') {
        result.errors.push({
          row: rowNum,
          field: 'name',
          message: 'Il nome azienda è obbligatorio',
        });
        hasError = true;
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
            result.warnings.push({
              row: rowNum,
              field: 'email',
              message: `Email già presente per: ${existing.name}`,
              value: email,
            });
          }
          // Controllo duplicato nel file
          if (fileEmailSet.has(email)) {
            result.warnings.push({
              row: rowNum,
              field: 'email',
              message: 'Email duplicata nel file',
              value: email,
            });
          }
          fileEmailSet.add(email);
        }
      }

      // Validazione PEC
      if (row.pec && !validatePec(row.pec)) {
        result.errors.push({
          row: rowNum,
          field: 'pec',
          message: 'PEC non valida',
          value: row.pec,
        });
        hasError = true;
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

      // Validazione SDI
      if (row.sdiCode && !validateSdiCode(row.sdiCode)) {
        result.warnings.push({
          row: rowNum,
          field: 'sdiCode',
          message: 'Codice SDI non valido',
          value: row.sdiCode,
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

    // Importa le righe valide
    for (const { data: row } of validRows) {
      try {
        await db.insert(schema.companies).values({
          clientId,
          name: row.name.trim(),
          vatNumber: row.vatNumber?.trim().toUpperCase() || null,
          taxCode: row.taxCode?.trim().toUpperCase() || null,
          address: row.address?.trim() || null,
          city: row.city?.trim() || null,
          province: row.province?.trim().toUpperCase() || null,
          postalCode: row.postalCode?.trim() || null,
          country: row.country?.trim() || 'Italia',
          phone: row.phone?.trim() || null,
          email: row.email?.trim().toLowerCase() || null,
          pec: row.pec?.trim().toLowerCase() || null,
          sdiCode: row.sdiCode?.trim().toUpperCase() || null,
          notes: row.notes?.trim() || null,
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
    console.error('Error importing companies:', error);
    return c.json({ error: error.message || 'Errore durante l\'importazione' }, 500);
  }
});

export default app;
