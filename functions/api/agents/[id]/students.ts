import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const agentId = parseInt(params.id as string);

  try {
    const body = await request.json() as any;
    const { studentId } = body;

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'ID studente obbligatorio' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = drizzle(env.DB, { schema });

    // Update student to link to agent
    await db.update(schema.students)
      .set({ agentId })
      .where(eq(schema.students.id, studentId));

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error adding student to agent:', error);
    return new Response(JSON.stringify({ error: 'Errore nell\'aggiunta dello studente', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const agentId = parseInt(params.id as string);

  try {
    const body = await request.json() as any;
    const { studentId } = body;

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'ID studente obbligatorio' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = drizzle(env.DB, { schema });

    // Remove agent link from student
    await db.update(schema.students)
      .set({ agentId: null })
      .where(eq(schema.students.id, studentId));

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error removing student from agent:', error);
    return new Response(JSON.stringify({ error: 'Errore nella rimozione dello studente', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
