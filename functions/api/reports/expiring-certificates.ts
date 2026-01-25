/**
 * API Endpoint: Expiring Certificates Report
 * GET /api/reports/expiring-certificates
 * 
 * Identifies students whose certificates are expiring within the next 90 days.
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { getDb } from '../../db';
import * as schema from '../../../drizzle/schema';
import { eq, and, sql, gte, sum, isNotNull, inArray } from 'drizzle-orm';

interface Env {
  DB: D1Database;
}

const router = Router();

/**
 * GET /api/reports/expiring-certificates
 * Get list of certificates expiring soon
 */
router.get('/api/reports/expiring-certificates', async (request: IRequest, env: Env) => {
  const db: DrizzleD1Database<typeof schema> = getDb(env.DB);

  try {
    // 1. Find all registrations that are 'completed'
    const completedRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.status, 'completed'),
      with: {
        student: true,
        edition: {
          with: {
            course: true,
          },
        },
      },
    });

    const expiringCertificates = await Promise.all(completedRegistrations.map(async (reg) => {
      const student = reg.student;
      const edition = reg.edition;
      const course = edition?.course;

      if (!student || !edition || !course || !course.certificateValidityMonths) return null;

      // Calculate certificate expiry date
      const completionDate = new Date(edition.endDate || edition.startDate || reg.registrationDate);
      const expiryDate = new Date(completionDate);
      expiryDate.setMonth(expiryDate.getMonth() + course.certificateValidityMonths);
      
      const now = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(now.getDate() + 90);

      // Check if certificate is expiring within the next 90 days
      if (expiryDate > now && expiryDate <= ninetyDaysFromNow) {
        return {
          registrationId: reg.id,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          companyName: student.companyId ? (await db.query.companies.findFirst({ where: eq(schema.companies.id, student.companyId) }))?.name : 'N/A',
          courseName: course.title,
          editionName: edition.name,
          expiryDate: expiryDate.toISOString().split('T')[0],
          daysRemaining: Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        };
      }

      return null;
    }));

    return new Response(
      JSON.stringify({ certificates: expiringCertificates.filter(c => c !== null) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching expiring certificates report:', error);
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
