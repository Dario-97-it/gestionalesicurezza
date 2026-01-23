/**
 * API per il controllo duplicati studenti
 * GET /api/students/check-duplicate?fiscalCode=XXX&excludeId=YYY
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, ne } from 'drizzle-orm';
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const auth = context.data.auth as AuthContext;

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const fiscalCode = url.searchParams.get('fiscalCode');
  const excludeId = url.searchParams.get('excludeId');

  if (!fiscalCode) {
    return new Response(JSON.stringify({ error: 'Codice fiscale richiesto' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Normalizza il codice fiscale
    const cfNormalized = fiscalCode.toUpperCase().trim();

    // Costruisci le condizioni
    const conditions: any[] = [
      eq(schema.students.clientId, auth.clientId),
      eq(schema.students.fiscalCode, cfNormalized)
    ];

    // Escludi l'ID corrente se specificato (per la modifica)
    if (excludeId) {
      conditions.push(ne(schema.students.id, parseInt(excludeId)));
    }

    // Cerca studenti con lo stesso codice fiscale
    const duplicates = await db.select({
      id: schema.students.id,
      firstName: schema.students.firstName,
      lastName: schema.students.lastName,
      fiscalCode: schema.students.fiscalCode,
    })
    .from(schema.students)
    .where(and(...conditions))
    .limit(1);

    if (duplicates.length > 0) {
      return new Response(JSON.stringify({
        isDuplicate: true,
        existingStudent: {
          id: duplicates[0].id,
          name: `${duplicates[0].firstName} ${duplicates[0].lastName}`,
          fiscalCode: duplicates[0].fiscalCode
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      isDuplicate: false,
      existingStudent: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Check duplicate error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
