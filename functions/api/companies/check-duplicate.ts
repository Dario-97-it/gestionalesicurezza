/**
 * API per il controllo duplicati aziende (P.IVA)
 * GET /api/companies/check-duplicate?vatNumber=XXX&excludeId=YYY
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, ne } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

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
  const vatNumber = url.searchParams.get('vatNumber');
  const excludeId = url.searchParams.get('excludeId');

  if (!vatNumber) {
    return new Response(JSON.stringify({ error: 'Partita IVA richiesta' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Normalizza la partita IVA (rimuovi spazi, IT prefix)
    const pivaNormalized = vatNumber
      .toUpperCase()
      .replace(/\s/g, '')
      .replace(/^IT/, '')
      .trim();

    // Costruisci le condizioni
    const conditions: any[] = [
      eq(schema.companies.clientId, auth.clientId),
      eq(schema.companies.vatNumber, pivaNormalized)
    ];

    // Escludi l'ID corrente se specificato (per la modifica)
    if (excludeId) {
      conditions.push(ne(schema.companies.id, parseInt(excludeId)));
    }

    // Cerca aziende con la stessa partita IVA
    const duplicates = await db.select({
      id: schema.companies.id,
      name: schema.companies.name,
      vatNumber: schema.companies.vatNumber,
    })
    .from(schema.companies)
    .where(and(...conditions))
    .limit(1);

    if (duplicates.length > 0) {
      return new Response(JSON.stringify({
        isDuplicate: true,
        existingCompany: {
          id: duplicates[0].id,
          name: duplicates[0].name,
          vatNumber: duplicates[0].vatNumber
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      isDuplicate: false,
      existingCompany: null
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
