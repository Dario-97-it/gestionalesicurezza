import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../../../drizzle/schema';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

interface TransferRequest {
  newCompanyId: number;
  reason?: string;
}

interface TransferResponse {
  success: boolean;
  message: string;
  student?: {
    id: number;
    firstName: string;
    lastName: string;
    oldCompanyId: number | null;
    oldCompanyName: string | null;
    newCompanyId: number;
    newCompanyName: string;
    transferredAt: string;
  };
  error?: string;
}

app.put('/', async (c) => {
  try {
    const clientId = c.get('clientId' as never) as number;
    const studentId = parseInt(c.req.param('id'), 10);

    if (!clientId || isNaN(studentId)) {
      return c.json({ error: 'Non autorizzato o ID non valido' }, 401);
    }

    const body = await c.req.json() as TransferRequest;
    const { newCompanyId, reason } = body;

    if (!newCompanyId || isNaN(newCompanyId)) {
      return c.json({ error: 'ID azienda di destinazione non valido' }, 400);
    }

    const db = drizzle(c.env.DB, { schema });

    // Verifica che lo studente esista e appartenga al cliente
    const student = await db.select({
      id: schema.students.id,
      firstName: schema.students.firstName,
      lastName: schema.students.lastName,
      companyId: schema.students.companyId,
    })
    .from(schema.students)
    .where(eq(schema.students.id, studentId))
    .limit(1);

    if (!student || student.length === 0) {
      return c.json({ error: 'Studente non trovato' }, 404);
    }

    const studentData = student[0];

    // Verifica che l'azienda di destinazione esista e appartenga al cliente
    const newCompany = await db.select({
      id: schema.companies.id,
      name: schema.companies.name,
    })
    .from(schema.companies)
    .where(eq(schema.companies.id, newCompanyId))
    .limit(1);

    if (!newCompany || newCompany.length === 0) {
      return c.json({ error: 'Azienda di destinazione non trovata' }, 404);
    }

    const newCompanyData = newCompany[0];

    // Ottieni l'azienda attuale (se esiste)
    let oldCompanyName: string | null = null;
    if (studentData.companyId) {
      const oldCompany = await db.select({
        name: schema.companies.name,
      })
      .from(schema.companies)
      .where(eq(schema.companies.id, studentData.companyId))
      .limit(1);

      if (oldCompany && oldCompany.length > 0) {
        oldCompanyName = oldCompany[0].name;
      }
    }

    // Verifica che non sia già associato alla stessa azienda
    if (studentData.companyId === newCompanyId) {
      return c.json({
        success: false,
        message: 'Lo studente è già associato a questa azienda',
      }, 400);
    }

    // Aggiorna l'azienda dello studente
    await db.update(schema.students)
      .set({
        companyId: newCompanyId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.students.id, studentId));

    // Registra il trasferimento nel log (se disponibile)
    // TODO: Aggiungere tabella di log per audit trail

    const response: TransferResponse = {
      success: true,
      message: `Studente trasferito da ${oldCompanyName || 'nessuna azienda'} a ${newCompanyData.name}`,
      student: {
        id: studentData.id,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        oldCompanyId: studentData.companyId,
        oldCompanyName,
        newCompanyId: newCompanyData.id,
        newCompanyName: newCompanyData.name,
        transferredAt: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Error transferring student:', error);
    return c.json({ error: error.message || 'Errore durante il trasferimento' }, 500);
  }
});

export default app;
