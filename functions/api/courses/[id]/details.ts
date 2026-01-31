import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "../../../../drizzle/schema";

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const courseId = context.params.id as string;

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = drizzle(env.DB, { schema });

    // Get course details
    const course = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, parseInt(courseId)))
      .limit(1);

    if (!course || course.length === 0) {
      return new Response(JSON.stringify({ error: "Corso non trovato" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get all editions for this course
    const editions = await db
      .select({
        id: schema.courseEditions.id,
        startDate: schema.courseEditions.startDate,
        endDate: schema.courseEditions.endDate,
        location: schema.courseEditions.location,
        maxParticipants: schema.courseEditions.maxParticipants,
        price: schema.courseEditions.price,
        isDedicated: schema.courseEditions.isDedicated,
        dedicatedCompanyId: schema.courseEditions.dedicatedCompanyId,
        status: schema.courseEditions.status,
      })
      .from(schema.courseEditions)
      .where(eq(schema.courseEditions.courseId, parseInt(courseId)));

    // For each edition, get registrations with student and company info
    const editionsWithDetails = await Promise.all(
      editions.map(async (edition) => {
        // Get registrations for this edition
        const registrations = await db
          .select({
            id: schema.registrations.id,
            studentId: schema.registrations.studentId,
            studentName: schema.students.firstName,
            studentLastName: schema.students.lastName,
            studentEmail: schema.students.email,
            companyId: schema.registrations.companyId,
            companyName: schema.companies.name,
            priceApplied: schema.registrations.priceApplied,
            status: schema.registrations.status,
            certificateDate: schema.registrations.certificateDate,
            attendancePercent: schema.registrations.attendancePercent,
          })
          .from(schema.registrations)
          .leftJoin(
            schema.students,
            eq(schema.registrations.studentId, schema.students.id)
          )
          .leftJoin(
            schema.companies,
            eq(schema.registrations.companyId, schema.companies.id)
          )
          .where(eq(schema.registrations.courseEditionId, edition.id));

        // Get unique companies and their prices for this edition
        const companyPrices = await db
          .select({
            companyId: schema.editionCompanyPrices.companyId,
            companyName: schema.companies.name,
            price: schema.editionCompanyPrices.price,
          })
          .from(schema.editionCompanyPrices)
          .leftJoin(
            schema.companies,
            eq(schema.editionCompanyPrices.companyId, schema.companies.id)
          )
          .where(eq(schema.editionCompanyPrices.editionId, edition.id));

        return {
          ...edition,
          registrations,
          companyPrices,
          totalRegistrations: registrations.length,
        };
      })
    );

    return new Response(
      JSON.stringify({
        course: course[0],
        editions: editionsWithDetails,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching course details:", error);
    return new Response(
      JSON.stringify({
        error: "Errore nel caricamento dei dettagli",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
