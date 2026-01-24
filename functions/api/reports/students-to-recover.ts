/**
 * API per recuperare gli studenti assenti/bocciati da riproporre
 * Gli assenti/bocciati vengono automaticamente riproposti in alto nella lista
 * per la prossima edizione dello stesso corso
 * 
 * GET /api/reports/students-to-recover - Lista studenti da recuperare
 */

import type { Env, AuthenticatedRequest } from '../../_middleware';

interface StudentToRecover {
  studentId: number;
  studentName: string;
  studentFiscalCode: string | null;
  companyId: number | null;
  companyName: string | null;
  courseId: number;
  courseTitle: string;
  courseCode: string;
  courseType: string;
  // Dettagli ultima edizione
  lastEditionId: number;
  lastEditionDate: string;
  lastEditionLocation: string;
  // Motivo recupero
  reason: 'absent' | 'failed' | 'partial_attendance';
  reasonDescription: string;
  attendancePercent: number | null;
  // Prossima edizione disponibile
  nextEditionId: number | null;
  nextEditionDate: string | null;
  nextEditionLocation: string | null;
  nextEditionAvailableSpots: number | null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const clientId = request.clientId;
  const db = context.env.DB;

  try {
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const courseType = url.searchParams.get('courseType');
    const companyId = url.searchParams.get('companyId');

    // Query per trovare studenti con:
    // 1. Iscrizioni cancellate
    // 2. Iscrizioni con frequenza insufficiente
    // 3. Presenze con status 'absent' in edizioni completate
    let query = `
      SELECT DISTINCT
        s.id as studentId,
        s.firstName || ' ' || s.lastName as studentName,
        s.fiscalCode as studentFiscalCode,
        s.companyId,
        comp.name as companyName,
        c.id as courseId,
        c.title as courseTitle,
        c.code as courseCode,
        c.type as courseType,
        ce.id as lastEditionId,
        ce.startDate as lastEditionDate,
        ce.location as lastEditionLocation,
        r.status as registrationStatus,
        r.attendancePercent,
        c.minAttendancePercent
      FROM registrations r
      JOIN students s ON s.id = r.studentId
      JOIN courseEditions ce ON ce.id = r.courseEditionId
      JOIN courses c ON c.id = ce.courseId
      LEFT JOIN companies comp ON comp.id = s.companyId
      WHERE r.clientId = ?
        AND ce.status = 'completed'
        AND (
          -- Iscrizione cancellata
          r.status = 'cancelled'
          -- Oppure frequenza insufficiente
          OR (r.attendancePercent IS NOT NULL AND r.attendancePercent < COALESCE(c.minAttendancePercent, 90))
          -- Oppure certificato non emesso (bocciato)
          OR (r.status = 'completed' AND r.certificateIssued = 0)
        )
        -- Non già iscritto a un'edizione futura dello stesso corso
        AND NOT EXISTS (
          SELECT 1 FROM registrations r2
          JOIN courseEditions ce2 ON ce2.id = r2.courseEditionId
          WHERE r2.studentId = s.id
            AND ce2.courseId = c.id
            AND ce2.status = 'scheduled'
            AND r2.status IN ('pending', 'confirmed')
        )
    `;

    const params: any[] = [clientId];

    if (courseId) {
      query += ` AND c.id = ?`;
      params.push(Number(courseId));
    }

    if (courseType) {
      query += ` AND c.type = ?`;
      params.push(courseType);
    }

    if (companyId) {
      query += ` AND s.companyId = ?`;
      params.push(Number(companyId));
    }

    query += ` ORDER BY c.type, c.title, s.lastName, s.firstName`;

    const { results: students } = await db.prepare(query).bind(...params).all();

    // Per ogni studente, trova la prossima edizione disponibile
    const studentsToRecover: StudentToRecover[] = [];

    for (const student of (students || [])) {
      // Determina il motivo del recupero
      let reason: 'absent' | 'failed' | 'partial_attendance' = 'absent';
      let reasonDescription = '';

      if ((student as any).registrationStatus === 'cancelled') {
        reason = 'absent';
        reasonDescription = 'Iscrizione annullata';
      } else if ((student as any).attendancePercent !== null) {
        const minPercent = (student as any).minAttendancePercent || 90;
        if ((student as any).attendancePercent < minPercent) {
          reason = 'partial_attendance';
          reasonDescription = `Frequenza insufficiente: ${(student as any).attendancePercent}% (min. ${minPercent}%)`;
        } else {
          reason = 'failed';
          reasonDescription = 'Non ha superato il corso';
        }
      } else {
        reason = 'failed';
        reasonDescription = 'Certificato non emesso';
      }

      // Trova la prossima edizione disponibile per questo corso
      const nextEdition = await db.prepare(`
        SELECT 
          ce.id,
          ce.startDate,
          ce.location,
          ce.maxParticipants,
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
      `).bind((student as any).courseId, clientId).first();

      studentsToRecover.push({
        studentId: (student as any).studentId,
        studentName: (student as any).studentName,
        studentFiscalCode: (student as any).studentFiscalCode,
        companyId: (student as any).companyId,
        companyName: (student as any).companyName,
        courseId: (student as any).courseId,
        courseTitle: (student as any).courseTitle,
        courseCode: (student as any).courseCode,
        courseType: (student as any).courseType,
        lastEditionId: (student as any).lastEditionId,
        lastEditionDate: (student as any).lastEditionDate,
        lastEditionLocation: (student as any).lastEditionLocation,
        reason,
        reasonDescription,
        attendancePercent: (student as any).attendancePercent,
        nextEditionId: (nextEdition as any)?.id || null,
        nextEditionDate: (nextEdition as any)?.startDate || null,
        nextEditionLocation: (nextEdition as any)?.location || null,
        nextEditionAvailableSpots: nextEdition 
          ? (nextEdition as any).maxParticipants - (nextEdition as any).currentRegistrations
          : null
      });
    }

    // Raggruppa per corso
    const byCourse: Record<string, StudentToRecover[]> = {};
    for (const student of studentsToRecover) {
      const key = `${student.courseCode} - ${student.courseTitle}`;
      if (!byCourse[key]) {
        byCourse[key] = [];
      }
      byCourse[key].push(student);
    }

    // Statistiche
    const stats = {
      totalStudents: studentsToRecover.length,
      byReason: {
        absent: studentsToRecover.filter(s => s.reason === 'absent').length,
        failed: studentsToRecover.filter(s => s.reason === 'failed').length,
        partial_attendance: studentsToRecover.filter(s => s.reason === 'partial_attendance').length
      },
      withNextEdition: studentsToRecover.filter(s => s.nextEditionId).length,
      withoutNextEdition: studentsToRecover.filter(s => !s.nextEditionId).length
    };

    return new Response(JSON.stringify({
      stats,
      byCourse,
      students: studentsToRecover
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching students to recover:', error);
    return new Response(JSON.stringify({ error: 'Errore nel recupero degli studenti' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
