/**
 * API Endpoint: Student Course History
 * GET /api/students/:id/courses
 * 
 * Retrieves the complete course history for a given student, including registration status,
 * attendance percentage, and certificate details.
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { getDb } from '../../db';
import * as schema from '../../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

interface Env {
  DB: D1Database;
}

const router = Router();

/**
 * GET /api/students/:id/courses
 * Get course history for a student
 */
router.get('/api/students/:id/courses', async (request: IRequest, env: Env) => {
  const db: DrizzleD1Database<typeof schema> = getDb(env.DB);
  const studentId = parseInt(request.params.id);

  if (isNaN(studentId)) {
    return new Response(JSON.stringify({ error: 'Invalid student ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Fetch all registrations for the student
    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.studentId, studentId),
      with: {
        edition: {
          with: {
            course: true,
          },
        },
      },
    });

    // 2. Process data to calculate attendance and certificate status
    const courseHistory = await Promise.all(registrations.map(async (reg) => {
      const edition = reg.edition;
      const course = edition?.course;

      if (!edition || !course) {
        return null; // Skip if edition or course data is missing
      }

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

      // Determine certificate status and expiry
      const certificateIssued = reg.status === 'completed' && attendancePercentage >= 90; // Example logic
      let certificateExpiry: string | undefined = undefined;

      if (certificateIssued && course.certificateValidityMonths) {
        const completionDate = new Date(edition.endDate || edition.startDate || reg.registrationDate);
        completionDate.setMonth(completionDate.getMonth() + course.certificateValidityMonths);
        certificateExpiry = completionDate.toISOString().split('T')[0];
      }

      return {
        id: reg.id,
        courseName: course.title,
        courseCode: course.code,
        editionDate: edition.startDate,
        location: edition.location,
        status: reg.status, // 'confirmed', 'completed', 'failed', etc.
        attendancePercentage,
        certificateIssued,
        certificateExpiry,
      };
    }));

    return new Response(
      JSON.stringify({ courses: courseHistory.filter(c => c !== null) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching student course history:', error);
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
