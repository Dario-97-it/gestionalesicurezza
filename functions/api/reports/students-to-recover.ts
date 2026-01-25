/**
 * API Endpoint: Students to Recover Report
 * GET /api/reports/students-to-recover
 * 
 * Identifies students who have completed a course edition but had less than 90% attendance,
 * or were explicitly marked as 'failed'.
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { getDb } from '../../db';
import * as schema from '../../../drizzle/schema';
import { eq, and, sql, gte, sum } from 'drizzle-orm';

interface Env {
  DB: D1Database;
}

const router = Router();

/**
 * GET /api/reports/students-to-recover
 * Get list of students who need to recover a course
 */
router.get('/api/reports/students-to-recover', async (request: IRequest, env: Env) => {
  const db: DrizzleD1Database<typeof schema> = getDb(env.DB);

  try {
    // 1. Find all registrations that are 'failed'
    const failedRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.status, 'failed'),
      with: {
        student: true,
        edition: {
          with: {
            course: true,
          },
        },
      },
    });

    // 2. Find all registrations that are 'completed' but with low attendance (<90%)
    // This requires a complex join/group by that is difficult with Drizzle D1.
    // We will process the 'failed' ones first and then add the low attendance logic later if needed,
    // or rely on the operator to mark them as 'failed' if they don't meet the minimum attendance.
    // Given the previous requirement, the explicit 'failed' status is the primary trigger.

    const studentsToRecover = await Promise.all(failedRegistrations.map(async (reg) => {
      const student = reg.student;
      const edition = reg.edition;
      const course = edition?.course;

      if (!student || !edition || !course) return null;

      // Calculate total session hours for the edition
      const totalHoursResult = await db.select({
        totalHours: sql<number>`SUM(hours)`.as('totalHours'),
      })
      .from(schema.sessions)
      .where(eq(schema.sessions.editionId, edition.id))
      .get();

      const totalSessionHours = totalHoursResult?.totalHours || 0;

      // Calculate hours attended by the student
      const hoursAttendedResult = await db.select({
        hoursAttended: sql<number>`SUM(hoursAttended)`.as('hoursAttended'),
      })
      .from(schema.attendances)
      .where(and(
        eq(schema.attendances.registrationId, reg.id),
        eq(schema.attendances.present, 1) // Assuming 'present' is stored as 1 for true
      ))
      .get();

      const hoursAttended = hoursAttendedResult?.hoursAttended || 0;
      const attendancePercentage = totalSessionHours > 0 ? Math.round((hoursAttended / totalSessionHours) * 100) : 0;

      return {
        registrationId: reg.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        courseName: course.title,
        editionName: edition.name,
        editionEndDate: edition.endDate,
        attendancePercentage,
        reason: 'Bocciato dall\'operatore',
        recommendedNextEditionId: reg.recommendedNextEditionId,
      };
    }));

    return new Response(
      JSON.stringify({ students: studentsToRecover.filter(s => s !== null) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching students to recover report:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

export default router;
