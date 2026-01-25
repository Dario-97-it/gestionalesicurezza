import { drizzle } from 'drizzle-orm/d1';
import { eq, and, isNotNull } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const auth = context.data.auth;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 401 });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Recupera tutte le iscrizioni completate con i dettagli di studente, corso ed edizione
    const results = await db.select({
      registrationId: schema.registrations.id,
      studentId: schema.students.id,
      studentName: schema.students.lastName, // Verrà unito con firstName sotto
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
      courseId: schema.courses.id,
      courseTitle: schema.courses.title,
      validityMonths: schema.courses.certificateValidityMonths,
      completionDate: schema.courseEditions.endDate,
      companyName: schema.companies.name,
    })
    .from(schema.registrations)
    .innerJoin(schema.students, eq(schema.registrations.studentId, schema.students.id))
    .innerJoin(schema.courseEditions, eq(schema.registrations.courseEditionId, schema.courseEditions.id))
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .leftJoin(schema.companies, eq(schema.registrations.companyId, schema.companies.id))
    .where(
      and(
        eq(schema.registrations.clientId, auth.clientId),
        eq(schema.registrations.status, 'completed')
      )
    );

    const now = new Date();
    const scadenze = results.map(r => {
      const completionDate = new Date(r.completionDate);
      const expiryDate = new Date(completionDate);
      expiryDate.setMonth(expiryDate.getMonth() + (r.validityMonths || 0));
      
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let urgency: 'scaduto' | 'entro30' | 'entro60' | 'entro90' | 'valido' = 'valido';
      if (diffDays <= 0) urgency = 'scaduto';
      else if (diffDays <= 30) urgency = 'entro30';
      else if (diffDays <= 60) urgency = 'entro60';
      else if (diffDays <= 90) urgency = 'entro90';

      return {
        id: r.registrationId,
        studentId: r.studentId,
        studentName: `${r.studentFirstName} ${r.studentLastName}`,
        courseId: r.courseId,
        courseTitle: r.courseTitle,
        completionDate: r.completionDate,
        expiryDate: expiryDate.toISOString().split('T')[0],
        daysRemaining: diffDays,
        urgency,
        companyName: r.companyName || 'Privato'
      };
    });

    // Ordina per urgenza (più urgenti prima)
    scadenze.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return new Response(JSON.stringify({
      success: true,
      data: scadenze
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
