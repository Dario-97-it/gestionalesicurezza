/**
 * API per il report tracciamento incarichi docenti
 * Mostra tutti gli incarichi assegnati ai docenti con dettagli
 * 
 * GET /api/reports/instructor-assignments - Report incarichi docenti
 */

import type { Env, AuthenticatedRequest } from '../../_middleware';

interface InstructorAssignment {
  editionId: number;
  courseTitle: string;
  courseCode: string;
  courseType: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  totalHours: number;
  totalStudents: number;
  editionType: string;
  // Sessioni
  sessions: Array<{
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    location: string | null;
  }>;
}

interface InstructorReport {
  instructorId: number;
  instructorName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  hourlyRate: number | null;
  // Statistiche
  totalAssignments: number;
  totalHours: number;
  totalStudents: number;
  totalEarnings: number | null;
  // Incarichi per stato
  assignmentsByStatus: {
    scheduled: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
  // Lista incarichi
  assignments: InstructorAssignment[];
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    const url = new URL(request.url);
    const instructorId = url.searchParams.get('instructorId');
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const status = url.searchParams.get('status');

    // Query per ottenere tutti i docenti con i loro incarichi
    let instructorQuery = `
      SELECT 
        i.id,
        i.firstName || ' ' || i.lastName as name,
        i.email,
        i.phone,
        i.specialization,
        i.hourlyRate
      FROM instructors i
      WHERE i.clientId = ?
        AND COALESCE(i.isActive, 1) = 1
    `;

    const instructorParams: any[] = [clientId];

    if (instructorId) {
      instructorQuery += ` AND i.id = ?`;
      instructorParams.push(Number(instructorId));
    }

    instructorQuery += ` ORDER BY i.lastName, i.firstName`;

    const { results: instructors } = await db.prepare(instructorQuery).bind(...instructorParams).all();

    const reports: InstructorReport[] = [];

    for (const instructor of (instructors || [])) {
      // Query per ottenere gli incarichi del docente
      let editionsQuery = `
        SELECT 
          ce.id as editionId,
          c.title as courseTitle,
          c.code as courseCode,
          c.type as courseType,
          ce.startDate,
          ce.endDate,
          ce.location,
          ce.status,
          COALESCE(ce.editionType, 'public') as editionType,
          (
            SELECT COUNT(*)
            FROM registrations r
            WHERE r.courseEditionId = ce.id
              AND r.status IN ('confirmed', 'completed')
          ) as totalStudents,
          (
            SELECT COALESCE(SUM(es.hours), 0)
            FROM editionSessions es
            WHERE es.editionId = ce.id
          ) as totalHours
        FROM courseEditions ce
        JOIN courses c ON c.id = ce.courseId
        WHERE ce.clientId = ?
          AND ce.instructorId = ?
          AND strftime('%Y', ce.startDate) = ?
      `;

      const editionParams: any[] = [clientId, (instructor as any).id, year];

      if (status) {
        editionsQuery += ` AND ce.status = ?`;
        editionParams.push(status);
      }

      editionsQuery += ` ORDER BY ce.startDate DESC`;

      const { results: editions } = await db.prepare(editionsQuery).bind(...editionParams).all();

      const assignments: InstructorAssignment[] = [];
      let totalHours = 0;
      let totalStudents = 0;
      const assignmentsByStatus = {
        scheduled: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0
      };

      for (const edition of (editions || [])) {
        // Ottieni le sessioni per questa edizione
        const { results: sessions } = await db.prepare(`
          SELECT 
            id,
            sessionDate as date,
            startTime,
            endTime,
            hours,
            location
          FROM editionSessions
          WHERE editionId = ?
          ORDER BY sessionDate, startTime
        `).bind((edition as any).editionId).all();

        const editionHours = (edition as any).totalHours || 0;
        totalHours += editionHours;
        totalStudents += (edition as any).totalStudents || 0;

        // Conta per stato
        const editionStatus = (edition as any).status as keyof typeof assignmentsByStatus;
        if (assignmentsByStatus[editionStatus] !== undefined) {
          assignmentsByStatus[editionStatus]++;
        }

        assignments.push({
          editionId: (edition as any).editionId,
          courseTitle: (edition as any).courseTitle,
          courseCode: (edition as any).courseCode,
          courseType: (edition as any).courseType,
          startDate: (edition as any).startDate,
          endDate: (edition as any).endDate,
          location: (edition as any).location,
          status: (edition as any).status,
          totalHours: editionHours,
          totalStudents: (edition as any).totalStudents,
          editionType: (edition as any).editionType,
          sessions: (sessions || []).map((s: any) => ({
            id: s.id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            hours: s.hours,
            location: s.location
          }))
        });
      }

      // Calcola guadagni totali se c'è tariffa oraria
      const hourlyRate = (instructor as any).hourlyRate;
      const totalEarnings = hourlyRate ? (totalHours * hourlyRate / 100) : null;

      reports.push({
        instructorId: (instructor as any).id,
        instructorName: (instructor as any).name,
        email: (instructor as any).email,
        phone: (instructor as any).phone,
        specialization: (instructor as any).specialization,
        hourlyRate: hourlyRate ? hourlyRate / 100 : null,
        totalAssignments: assignments.length,
        totalHours,
        totalStudents,
        totalEarnings,
        assignmentsByStatus,
        assignments
      });
    }

    // Statistiche generali
    const stats = {
      totalInstructors: reports.length,
      totalAssignments: reports.reduce((sum, r) => sum + r.totalAssignments, 0),
      totalHours: reports.reduce((sum, r) => sum + r.totalHours, 0),
      totalStudents: reports.reduce((sum, r) => sum + r.totalStudents, 0),
      byStatus: {
        scheduled: reports.reduce((sum, r) => sum + r.assignmentsByStatus.scheduled, 0),
        ongoing: reports.reduce((sum, r) => sum + r.assignmentsByStatus.ongoing, 0),
        completed: reports.reduce((sum, r) => sum + r.assignmentsByStatus.completed, 0),
        cancelled: reports.reduce((sum, r) => sum + r.assignmentsByStatus.cancelled, 0)
      }
    };

    return new Response(JSON.stringify({
      year: parseInt(year),
      stats,
      instructors: reports
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error generating instructor assignments report:', error);
    return new Response(JSON.stringify({ error: 'Errore nella generazione del report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
