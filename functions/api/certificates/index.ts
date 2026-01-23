/**
 * API Scadenzario Attestati
 * GET /api/certificates - Ottieni lista attestati in scadenza
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, and, gte, lte, like, or, desc } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

// GET - Lista attestati in scadenza
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });
    const url = new URL(request.url);
    
    // Parametri filtro
    const search = url.searchParams.get('search') || '';
    const urgency = url.searchParams.get('urgency'); // expired, high, medium, low
    const companyId = url.searchParams.get('companyId');

    // Date per calcolo scadenze
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Query base: registrazioni completate
    const completedRegistrations = await db.select({
      id: schema.registrations.id,
      studentId: schema.registrations.studentId,
      editionId: schema.registrations.editionId,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
      studentEmail: schema.students.email,
      companyId: schema.students.companyId,
      companyName: schema.companies.name,
      courseId: schema.courses.id,
      courseTitle: schema.courses.title,
      courseCode: schema.courses.code,
      courseValidityMonths: schema.courses.validityMonths,
      editionEndDate: schema.courseEditions.endDate,
    })
    .from(schema.registrations)
    .innerJoin(schema.students, eq(schema.registrations.studentId, schema.students.id))
    .innerJoin(schema.courseEditions, eq(schema.registrations.editionId, schema.courseEditions.id))
    .innerJoin(schema.courses, eq(schema.courseEditions.courseId, schema.courses.id))
    .leftJoin(schema.companies, eq(schema.students.companyId, schema.companies.id))
    .where(and(
      eq(schema.registrations.clientId, auth.clientId),
      eq(schema.registrations.status, 'completed')
    ));

    // Calcola scadenze e filtra
    const certificates = completedRegistrations
      .map(reg => {
        if (!reg.editionEndDate || !reg.courseValidityMonths) return null;
        
        const endDate = new Date(reg.editionEndDate);
        const expiryDate = new Date(endDate);
        expiryDate.setMonth(expiryDate.getMonth() + reg.courseValidityMonths);
        
        const expiryStr = expiryDate.toISOString().split('T')[0];
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determina urgenza
        let urgencyLevel: 'expired' | 'high' | 'medium' | 'low';
        if (daysUntilExpiry < 0) {
          urgencyLevel = 'expired';
        } else if (daysUntilExpiry <= 30) {
          urgencyLevel = 'high';
        } else if (daysUntilExpiry <= 60) {
          urgencyLevel = 'medium';
        } else if (daysUntilExpiry <= 90) {
          urgencyLevel = 'low';
        } else {
          return null; // Oltre 90 giorni, non mostrare
        }
        
        return {
          id: reg.id,
          studentId: reg.studentId,
          studentName: `${reg.studentFirstName} ${reg.studentLastName}`,
          studentEmail: reg.studentEmail || '',
          companyId: reg.companyId,
          companyName: reg.companyName || 'N/A',
          courseTitle: reg.courseTitle,
          courseCode: reg.courseCode || '',
          completionDate: reg.editionEndDate,
          expiryDate: expiryStr,
          daysUntilExpiry,
          urgency: urgencyLevel,
          validityMonths: reg.courseValidityMonths,
        };
      })
      .filter(Boolean)
      // Filtra per urgenza
      .filter(cert => {
        if (!urgency || urgency === 'all') return true;
        return cert!.urgency === urgency;
      })
      // Filtra per ricerca
      .filter(cert => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          cert!.studentName.toLowerCase().includes(searchLower) ||
          cert!.companyName.toLowerCase().includes(searchLower) ||
          cert!.courseTitle.toLowerCase().includes(searchLower)
        );
      })
      // Filtra per azienda
      .filter(cert => {
        if (!companyId) return true;
        return cert!.companyId === parseInt(companyId);
      })
      // Ordina per urgenza (scaduti prima, poi per giorni)
      .sort((a, b) => {
        const urgencyOrder = { expired: 0, high: 1, medium: 2, low: 3 };
        const urgencyDiff = urgencyOrder[a!.urgency] - urgencyOrder[b!.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return a!.daysUntilExpiry - b!.daysUntilExpiry;
      });

    return new Response(JSON.stringify(certificates), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Certificates API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
