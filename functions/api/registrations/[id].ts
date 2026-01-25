/**
 * API Registrations by ID - Gestione iscrizioni singole
 * GET /api/registrations/[id] - Dettagli iscrizione
 * PUT /api/registrations/[id] - Aggiorna iscrizione
 * DELETE /api/registrations/[id] - Elimina iscrizione
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
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

// GET - Dettagli iscrizione
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const auth = context.data.auth as AuthContext;
  const registrationId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    const registration = await db.select()
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, registrationId),
          eq(schema.registrations.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (registration.length === 0) {
      return new Response(JSON.stringify({ error: 'Iscrizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(registration[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Get registration error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Aggiorna iscrizione
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const auth = context.data.auth as AuthContext;
  const registrationId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const db = drizzle(env.DB, { schema });

    // Verifica che l'iscrizione appartenga al cliente
    const existing = await db.select()
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, registrationId),
          eq(schema.registrations.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Iscrizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepara i dati da aggiornare
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.certificateDate !== undefined) {
      updateData.certificateDate = body.certificateDate;
    }
    if (body.priceApplied !== undefined) {
      updateData.priceApplied = body.priceApplied;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.recommendedNextEditionId !== undefined) {
      updateData.recommendedNextEditionId = body.recommendedNextEditionId;
    }

    // Aggiorna l'iscrizione
    const result = await db.update(schema.registrations)
      .set(updateData)
      .where(eq(schema.registrations.id, registrationId))
      .returning();

    return new Response(JSON.stringify({
      success: true,
      data: result[0] || {},
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Update registration error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Elimina iscrizione
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;
  const registrationId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Verifica che l'iscrizione appartenga al cliente
    const existing = await db.select()
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, registrationId),
          eq(schema.registrations.clientId, auth.clientId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Iscrizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Elimina l'iscrizione
    await db.delete(schema.registrations)
      .where(eq(schema.registrations.id, registrationId));

    return new Response(JSON.stringify({
      success: true,
      message: 'Iscrizione eliminata',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete registration error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
