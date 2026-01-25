import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface RegistrationRow {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  studentPhone?: string;
  companyName?: string;
  courseId: number;
  courseEditionId: number;
  priceApplied?: number;
  notes?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{
    rowNumber: number;
    error: string;
  }>;
  warnings: Array<{
    rowNumber: number;
    warning: string;
  }>;
}

// POST /api/registrations/import-batch - Importa iscrizioni da CSV
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metodo non supportato' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = drizzle(env.DB, { schema });
  const auth = context.data.auth as { clientId: number; userId: number } | undefined;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dryRun = formData.get('dryRun') === 'true';

    if (!file) {
      return new Response(JSON.stringify({ error: 'File non fornito' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Leggi il file CSV
    const csvText = await file.text();
    const lines = csvText.trim().split('\n');

    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: 'File CSV vuoto o non valido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredFields = ['studentfirstname', 'studentlastname', 'studentemail', 'courseid', 'courseeditionid'];
    
    for (const field of requiredFields) {
      if (!headers.includes(field)) {
        return new Response(JSON.stringify({ 
          error: `Campo obbligatorio mancante: ${field}` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const result: ImportResult = {
      success: true,
      totalRows: lines.length - 1,
      importedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: []
    };

    // Processa ogni riga
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: any = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }

      try {
        // Validazione
        if (!row.studentfirstname) {
          result.errors.push({ rowNumber: i + 1, error: 'Nome studente mancante' });
          result.skippedCount++;
          continue;
        }

        if (!row.studentlastname) {
          result.errors.push({ rowNumber: i + 1, error: 'Cognome studente mancante' });
          result.skippedCount++;
          continue;
        }

        if (!row.studentemail) {
          result.errors.push({ rowNumber: i + 1, error: 'Email studente mancante' });
          result.skippedCount++;
          continue;
        }

        const courseId = parseInt(row.courseid);
        const courseEditionId = parseInt(row.courseeditionid);

        if (isNaN(courseId) || isNaN(courseEditionId)) {
          result.errors.push({ rowNumber: i + 1, error: 'ID corso o edizione non valido' });
          result.skippedCount++;
          continue;
        }

        // Verifica che il corso e l'edizione esistano
        const course = await db.query.courses.findFirst({
          where: and(
            eq(schema.courses.id, courseId),
            eq(schema.courses.clientId, auth.clientId)
          )
        });

        if (!course) {
          result.errors.push({ rowNumber: i + 1, error: `Corso ${courseId} non trovato` });
          result.skippedCount++;
          continue;
        }

        const edition = await db.query.courseEditions.findFirst({
          where: and(
            eq(schema.courseEditions.id, courseEditionId),
            eq(schema.courseEditions.clientId, auth.clientId),
            eq(schema.courseEditions.courseId, courseId)
          )
        });

        if (!edition) {
          result.errors.push({ rowNumber: i + 1, error: `Edizione ${courseEditionId} non trovata` });
          result.skippedCount++;
          continue;
        }

        // Trova o crea lo studente
        let student = await db.query.students.findFirst({
          where: and(
            eq(schema.students.clientId, auth.clientId),
            eq(schema.students.email, row.studentemail)
          )
        });

        if (!student) {
          // Crea nuovo studente
          const insertResult = await db.insert(schema.students).values({
            clientId: auth.clientId,
            firstName: row.studentfirstname,
            lastName: row.studentlastname,
            email: row.studentemail,
            phone: row.studentphone || null,
            notes: row.notes || null,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).returning();

          student = insertResult[0];
          result.warnings.push({ 
            rowNumber: i + 1, 
            warning: `Nuovo studente creato: ${row.studentemail}` 
          });
        }

        // Verifica se l'iscrizione esiste già
        const existingRegistration = await db.query.registrations.findFirst({
          where: and(
            eq(schema.registrations.clientId, auth.clientId),
            eq(schema.registrations.studentId, student.id),
            eq(schema.registrations.courseEditionId, courseEditionId)
          )
        });

        if (existingRegistration) {
          result.warnings.push({ 
            rowNumber: i + 1, 
            warning: `Iscrizione già esistente per ${row.studentemail}` 
          });
          result.skippedCount++;
          continue;
        }

        // Trova l'azienda se specificata
        let companyId: number | null = null;
        if (row.companyname) {
          const company = await db.query.companies.findFirst({
            where: and(
              eq(schema.companies.clientId, auth.clientId),
              eq(schema.companies.name, row.companyname)
            )
          });

          if (company) {
            companyId = company.id;
          } else {
            result.warnings.push({ 
              rowNumber: i + 1, 
              warning: `Azienda "${row.companyname}" non trovata` 
            });
          }
        }

        // Se non è un dry run, crea l'iscrizione
        if (!dryRun) {
          const priceApplied = parseInt(row.priceapplied) || edition.price || 0;

          await db.insert(schema.registrations).values({
            clientId: auth.clientId,
            studentId: student.id,
            courseEditionId: courseEditionId,
            companyId: companyId,
            registrationDate: new Date().toISOString(),
            status: 'confirmed',
            priceApplied: priceApplied,
            totalHoursAttended: 0,
            attendancePercent: 0,
            certificateIssued: false,
            notes: row.notes || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        result.importedCount++;
      } catch (error: any) {
        result.errors.push({ 
          rowNumber: i + 1, 
          error: error.message || 'Errore sconosciuto' 
        });
        result.skippedCount++;
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error importing registrations:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore nell\'importazione',
      details: (error as any).message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
