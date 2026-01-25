/**
 * API Endpoint: Bulk Registration
 * POST /api/registrations/bulk
 * 
 * Handles massive enrollment of students to a course edition.
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { getDb } from '../../db';
import * as schema from '../../../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface BulkRegistrationRequest {
  courseEditionId: number;
  studentIds: number[];
}

interface Env {
  RESEND_API_KEY: string;
  DB: D1Database;
  KV: KVNamespace;
}

const router = Router();

/**
 * POST /api/registrations/bulk
 * Create multiple registrations
 */
router.post('/api/registrations/bulk', async (request: IRequest, env: Env) => {
  const db: DrizzleD1Database<typeof schema> = getDb(env.DB);
  
  try {
    // Verify authentication (simplified for example)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: BulkRegistrationRequest = await request.json();
    const { courseEditionId, studentIds } = body;

    if (!courseEditionId || !studentIds || studentIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: courseEditionId and studentIds' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get client ID from token (assuming this is handled by middleware or token parsing)
    // For now, we'll use a placeholder
    const clientId = 1; 

    // 1. Get Edition and Course details
    const edition = await db.query.courseEditions.findFirst({
      where: eq(schema.courseEditions.id, courseEditionId),
      with: {
        course: true,
      },
    });

    if (!edition) {
      return new Response(
        JSON.stringify({ error: 'Course Edition not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check for existing registrations to avoid duplicates
    const existingRegistrations = await db.query.registrations.findMany({
      where: and(
        eq(schema.registrations.courseEditionId, courseEditionId),
        inArray(schema.registrations.studentId, studentIds)
      ),
      columns: {
        studentId: true,
      },
    });

    const existingStudentIds = new Set(existingRegistrations.map(reg => reg.studentId));
    const studentsToRegister = studentIds.filter(id => !existingStudentIds.has(id));

    let successCount = 0;
    let failedCount = studentIds.length - studentsToRegister.length; // Already registered students

    // 3. Perform bulk insert
    if (studentsToRegister.length > 0) {
      const registrationsToInsert = studentsToRegister.map(studentId => ({
        clientId,
        studentId,
        courseEditionId,
        companyId: null, // Will be updated later or derived from student data
        registrationDate: new Date().toISOString(),
        status: 'confirmed' as const,
        priceApplied: edition.price,
      }));

      // Drizzle D1 bulk insert
      const insertResult = await db.insert(schema.registrations).values(registrationsToInsert).run();
      
      // D1 returns { success: true, meta: { changes: number } }
      successCount += insertResult.meta.changes;
    }

    return new Response(
      JSON.stringify({
        successCount,
        failedCount,
        message: `Bulk registration completed. ${successCount} new registrations created. ${failedCount} students were already registered.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in bulk registration endpoint:', error);
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
