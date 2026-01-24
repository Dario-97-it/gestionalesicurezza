/**
 * API per il report aggregato delle iscrizioni per tipo corso
 * Serve per decidere se attivare o meno un'edizione (soglia minima partecipanti)
 * 
 * GET /api/reports/enrollment-summary - Report iscrizioni aggregate per tipo corso
 */

import type { Env, AuthenticatedRequest } from '../../_middleware';

interface EnrollmentSummary {
  courseId: number;
  courseTitle: string;
  courseCode: string;
  courseType: string;
  // Iscrizioni in attesa (pending) per edizioni future
  pendingRegistrations: number;
  // Edizioni programmate
  scheduledEditions: number;
  // Prossima edizione
  nextEditionId: number | null;
  nextEditionDate: string | null;
  nextEditionLocation: string | null;
  nextEditionMinParticipants: number;
  nextEditionMaxParticipants: number;
  nextEditionCurrentRegistrations: number;
  // Suggerimento attivazione
  canActivate: boolean;
  activationMessage: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    const url = new URL(request.url);
    const courseType = url.searchParams.get('courseType');
    const onlyPending = url.searchParams.get('onlyPending') === 'true';

    // Query per ottenere il riepilogo per ogni corso
    let query = `
      SELECT 
        c.id as courseId,
        c.title as courseTitle,
        c.code as courseCode,
        c.type as courseType,
        c.durationHours,
        -- Conta iscrizioni pending per edizioni future di questo corso
        (
          SELECT COUNT(*)
          FROM registrations r
          JOIN courseEditions ce ON ce.id = r.courseEditionId
          WHERE ce.courseId = c.id 
            AND ce.clientId = ?
            AND ce.status = 'scheduled'
            AND r.status IN ('pending', 'confirmed')
        ) as totalRegistrations,
        -- Conta edizioni programmate
        (
          SELECT COUNT(*)
          FROM courseEditions ce
          WHERE ce.courseId = c.id 
            AND ce.clientId = ?
            AND ce.status = 'scheduled'
            AND ce.startDate >= date('now')
        ) as scheduledEditions
      FROM courses c
      WHERE c.clientId = ?
        AND c.isActive = 1
    `;

    const params: any[] = [clientId, clientId, clientId];

    if (courseType) {
      query += ` AND c.type = ?`;
      params.push(courseType);
    }

    query += ` ORDER BY c.type, c.title`;

    const { results: courses } = await db.prepare(query).bind(...params).all();

    // Per ogni corso, ottieni dettagli sulla prossima edizione
    const summaries: EnrollmentSummary[] = [];

    for (const course of (courses || [])) {
      // Trova la prossima edizione programmata
      const nextEdition = await db.prepare(`
        SELECT 
          ce.id,
          ce.startDate,
          ce.location,
          ce.maxParticipants,
          COALESCE(ce.minParticipants, 1) as minParticipants,
          (
            SELECT COUNT(*)
            FROM registrations r
            WHERE r.courseEditionId = ce.id
              AND r.status IN ('pending', 'confirmed')
          ) as currentRegistrations
        FROM courseEditions ce
        WHERE ce.courseId = ?
          AND ce.clientId = ?
          AND ce.status = 'scheduled'
          AND ce.startDate >= date('now')
        ORDER BY ce.startDate ASC
        LIMIT 1
      `).bind((course as any).courseId, clientId).first();

      const minParticipants = (nextEdition as any)?.minParticipants || 1;
      const currentRegs = (nextEdition as any)?.currentRegistrations || 0;
      const canActivate = currentRegs >= minParticipants;

      let activationMessage = '';
      if (!nextEdition) {
        activationMessage = 'Nessuna edizione programmata';
      } else if (canActivate) {
        activationMessage = `✅ Pronto per attivazione (${currentRegs}/${minParticipants} min)`;
      } else {
        const missing = minParticipants - currentRegs;
        activationMessage = `⚠️ Mancano ${missing} iscritti per attivare (${currentRegs}/${minParticipants})`;
      }

      // Se filtriamo solo pending e non ci sono iscrizioni, salta
      if (onlyPending && (course as any).totalRegistrations === 0) {
        continue;
      }

      summaries.push({
        courseId: (course as any).courseId,
        courseTitle: (course as any).courseTitle,
        courseCode: (course as any).courseCode,
        courseType: (course as any).courseType,
        pendingRegistrations: (course as any).totalRegistrations,
        scheduledEditions: (course as any).scheduledEditions,
        nextEditionId: (nextEdition as any)?.id || null,
        nextEditionDate: (nextEdition as any)?.startDate || null,
        nextEditionLocation: (nextEdition as any)?.location || null,
        nextEditionMinParticipants: minParticipants,
        nextEditionMaxParticipants: (nextEdition as any)?.maxParticipants || 0,
        nextEditionCurrentRegistrations: currentRegs,
        canActivate,
        activationMessage
      });
    }

    // Raggruppa per tipo corso
    const byType: Record<string, EnrollmentSummary[]> = {};
    for (const summary of summaries) {
      const type = summary.courseType || 'Altro';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(summary);
    }

    // Statistiche generali
    const stats = {
      totalCourses: summaries.length,
      coursesReadyToActivate: summaries.filter(s => s.canActivate).length,
      coursesNeedMoreRegistrations: summaries.filter(s => !s.canActivate && s.nextEditionId).length,
      coursesWithoutEditions: summaries.filter(s => !s.nextEditionId).length,
      totalPendingRegistrations: summaries.reduce((sum, s) => sum + s.pendingRegistrations, 0)
    };

    return new Response(JSON.stringify({
      stats,
      byType,
      summaries
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error generating enrollment summary:', error);
    return new Response(JSON.stringify({ error: 'Errore nella generazione del report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
