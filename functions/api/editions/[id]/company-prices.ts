/**
 * API per gestire i prezzi personalizzati per azienda in un'edizione
 * 
 * GET /api/editions/:id/company-prices - Lista prezzi per azienda
 * POST /api/editions/:id/company-prices - Aggiungi/aggiorna prezzo per azienda
 * DELETE /api/editions/:id/company-prices/:companyId - Rimuovi prezzo personalizzato
 */

import type { Env, AuthenticatedRequest } from '../../../_middleware';

interface CompanyPrice {
  id: number;
  companyId: number;
  companyName: string;
  customPrice: number;
  notes: string | null;
}

// GET - Lista prezzi per azienda
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const { id } = context.params;
  const editionId = Number(id);
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    // Verifica che l'edizione esista e appartenga al cliente
    const edition = await db.prepare(
      'SELECT id FROM courseEditions WHERE id = ? AND clientId = ?'
    ).bind(editionId, clientId).first();

    if (!edition) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Recupera i prezzi personalizzati per azienda
    const { results } = await db.prepare(`
      SELECT 
        ecp.id,
        ecp.companyId,
        c.name as companyName,
        ecp.customPrice,
        ecp.notes
      FROM editionCompanyPrices ecp
      JOIN companies c ON c.id = ecp.companyId
      WHERE ecp.editionId = ? AND ecp.clientId = ?
      ORDER BY c.name
    `).bind(editionId, clientId).all();

    return new Response(JSON.stringify({
      prices: results || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching company prices:', error);
    return new Response(JSON.stringify({ error: 'Errore nel recupero dei prezzi' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Aggiungi/aggiorna prezzo per azienda
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const { id } = context.params;
  const editionId = Number(id);
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    const body = await request.json() as {
      companyId: number;
      customPrice: number;
      notes?: string;
    };

    if (!body.companyId || body.customPrice === undefined) {
      return new Response(JSON.stringify({ error: 'companyId e customPrice sono obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verifica che l'edizione esista e appartenga al cliente
    const edition = await db.prepare(
      'SELECT id, price FROM courseEditions WHERE id = ? AND clientId = ?'
    ).bind(editionId, clientId).first();

    if (!edition) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verifica che l'azienda esista e appartenga al cliente
    const company = await db.prepare(
      'SELECT id FROM companies WHERE id = ? AND clientId = ?'
    ).bind(body.companyId, clientId).first();

    if (!company) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();
    const priceInCents = Math.round(body.customPrice * 100);

    // Upsert: inserisci o aggiorna se esiste già
    const existing = await db.prepare(
      'SELECT id FROM editionCompanyPrices WHERE editionId = ? AND companyId = ?'
    ).bind(editionId, body.companyId).first();

    if (existing) {
      // Aggiorna
      await db.prepare(`
        UPDATE editionCompanyPrices 
        SET customPrice = ?, notes = ?, updatedAt = ?
        WHERE editionId = ? AND companyId = ?
      `).bind(priceInCents, body.notes || null, now, editionId, body.companyId).run();
    } else {
      // Inserisci
      await db.prepare(`
        INSERT INTO editionCompanyPrices (clientId, editionId, companyId, customPrice, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(clientId, editionId, body.companyId, priceInCents, body.notes || null, now, now).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: existing ? 'Prezzo aggiornato' : 'Prezzo aggiunto'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error saving company price:', error);
    return new Response(JSON.stringify({ error: 'Errore nel salvataggio del prezzo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Rimuovi prezzo personalizzato
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const { id } = context.params;
  const editionId = Number(id);
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId è obbligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.prepare(`
      DELETE FROM editionCompanyPrices 
      WHERE editionId = ? AND companyId = ? AND clientId = ?
    `).bind(editionId, Number(companyId), clientId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Prezzo personalizzato rimosso'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error deleting company price:', error);
    return new Response(JSON.stringify({ error: 'Errore nella rimozione del prezzo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
