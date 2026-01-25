/**
 * API Endpoint: Company Course History
 * GET /api/companies/:id/courses
 * 
 * Retrieves the complete course history for a given company, including all registrations
 * of its associated students.
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { getDb } from '../../db';
import * as schema from '../../../drizzle/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

interface Env {
  DB: D1Database;
}

const router = Router();

/**
 * GET /api/companies/:id/courses
 * Get course history for a company
 */
router.get('/api/companies/:id/courses', async (request: IRequest, env: Env) => {
  const db: DrizzleD1Database<typeof schema> = getDb(env.DB);
  const companyId = parseInt(request.params.id);

  if (isNaN(companyId)) {
    return new Response(JSON.stringify({ error: 'Invalid company ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Fetch all students associated with the company
    const students = await db.query.students.findMany({
      where: eq(schema.students.companyId, companyId),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const studentIds = students.map(s => s.id);

    if (studentIds.length === 0) {
      return new Response(
        JSON.stringify({ courses: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch all registrations for these students
    const registrations = await db.query.registrations.findMany({
      where: inArray(schema.registrations.studentId, studentIds),
      with: {
        edition: {
          with: {
            course: true,
          },
        },
        student: true,
      },
    });

    // 3. Process data to calculate attendance and certificate status for each registration
    const courseHistory = await Promise.all(registrations.map(async (reg) => {
      const edition = reg.edition;
      const course = edition?.course;
      const student = reg.student;

      if (!edition || !course || !student) {
        return null;
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
        eq(schema.attendances.present, 1)
      ))
      .get();

      const hoursAttended = hoursAttendedResult?.hoursAttended || 0;
      const attendancePercentage = totalSessionHours > 0 ? Math.round((hoursAttended / totalSessionHours) * 100) : 0;

      // Determine certificate status and expiry
      const certificateIssued = reg.status === 'completed' && attendancePercentage >= 90;
      let certificateExpiry: string | undefined = undefined;

      if (certificateIssued && course.certificateValidityMonths) {
        const completionDate = new Date(edition.endDate || edition.startDate || reg.registrationDate);
        completionDate.setMonth(completionDate.getMonth() + course.certificateValidityMonths);
        certificateExpiry = completionDate.toISOString().split('T')[0];
      }

      return {
        id: reg.id,
        studentName: `${student.firstName} ${student.lastName}`,
        courseName: course.title,
        courseCode: course.code,
        editionDate: edition.startDate,
        location: edition.location,
        status: reg.status,
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
    console.error('Error fetching company course history:', error);
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
