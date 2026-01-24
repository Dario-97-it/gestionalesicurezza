/**
 * API per gestire le aziende autorizzate in un'edizione multi-azienda
 * 
 * GET /api/editions/:id/allowed-companies - Lista aziende autorizzate
 * POST /api/editions/:id/allowed-companies - Aggiungi azienda
 * DELETE /api/editions/:id/allowed-companies/:companyId - Rimuovi azienda
 */

import type { Env, AuthenticatedRequest } from '../../../_middleware';

// GET - Lista aziende autorizzate
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const { id } = context.params;
  const editionId = Number(id);
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    // Verifica che l'edizione esista e appartenga al cliente
    const edition = await db.prepare(
      'SELECT id, editionType FROM courseEditions WHERE id = ? AND clientId = ?'
    ).bind(editionId, clientId).first();

    if (!edition) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Recupera le aziende autorizzate
    const { results } = await db.prepare(`
      SELECT 
        eac.id,
        eac.companyId,
        c.name as companyName,
        c.vatNumber,
        c.email,
        c.phone,
        eac.createdAt
      FROM editionAllowedCompanies eac
      JOIN companies c ON c.id = eac.companyId
      WHERE eac.editionId = ?
      ORDER BY c.name
    `).bind(editionId).all();

    return new Response(JSON.stringify({
      editionType: (edition as any).editionType || 'public',
      companies: results || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching allowed companies:', error);
    return new Response(JSON.stringify({ error: 'Errore nel recupero delle aziende' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Aggiungi azienda autorizzata
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const { id } = context.params;
  const editionId = Number(id);
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    const body = await request.json() as {
      companyId: number;
    };

    if (!body.companyId) {
      return new Response(JSON.stringify({ error: 'companyId è obbligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verifica che l'edizione esista, appartenga al cliente e sia di tipo multi
    const edition = await db.prepare(
      'SELECT id, editionType FROM courseEditions WHERE id = ? AND clientId = ?'
    ).bind(editionId, clientId).first();

    if (!edition) {
      return new Response(JSON.stringify({ error: 'Edizione non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verifica che l'azienda esista e appartenga al cliente
    const company = await db.prepare(
      'SELECT id, name FROM companies WHERE id = ? AND clientId = ?'
    ).bind(body.companyId, clientId).first();

    if (!company) {
      return new Response(JSON.stringify({ error: 'Azienda non trovata' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verifica se già esiste
    const existing = await db.prepare(
      'SELECT id FROM editionAllowedCompanies WHERE editionId = ? AND companyId = ?'
    ).bind(editionId, body.companyId).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Azienda già aggiunta' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();

    // Inserisci
    await db.prepare(`
      INSERT INTO editionAllowedCompanies (editionId, companyId, createdAt)
      VALUES (?, ?, ?)
    `).bind(editionId, body.companyId, now).run();

    // Se l'edizione non è già multi, aggiornala
    if ((edition as any).editionType !== 'multi') {
      await db.prepare(`
        UPDATE courseEditions SET editionType = 'multi', updatedAt = ?
        WHERE id = ?
      `).bind(now, editionId).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Azienda "${(company as any).name}" aggiunta`,
      company: {
        id: body.companyId,
        name: (company as any).name
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error adding allowed company:', error);
    return new Response(JSON.stringify({ error: 'Errore nell\'aggiunta dell\'azienda' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Rimuovi azienda autorizzata
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

    await db.prepare(`
      DELETE FROM editionAllowedCompanies 
      WHERE editionId = ? AND companyId = ?
    `).bind(editionId, Number(companyId)).run();

    // Conta quante aziende rimangono
    const remaining = await db.prepare(
      'SELECT COUNT(*) as count FROM editionAllowedCompanies WHERE editionId = ?'
    ).bind(editionId).first();

    // Se non ci sono più aziende, torna a public
    if ((remaining as any)?.count === 0) {
      await db.prepare(`
        UPDATE courseEditions SET editionType = 'public', updatedAt = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), editionId).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Azienda rimossa',
      remainingCompanies: (remaining as any)?.count || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error removing allowed company:', error);
    return new Response(JSON.stringify({ error: 'Errore nella rimozione dell\'azienda' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
