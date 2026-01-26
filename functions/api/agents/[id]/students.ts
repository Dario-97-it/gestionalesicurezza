import { json } from 'itty-router';

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const agentId = pathParts[pathParts.length - 3];

  // POST - Add student to agent
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { studentId } = body;

      if (!studentId) {
        return json({ error: 'ID studente obbligatorio' }, { status: 400 });
      }

      const db = env.DB as D1Database;

      // Update student to link to agent
      await db
        .prepare('UPDATE students SET agent_id = ? WHERE id = ?')
        .bind(agentId, studentId)
        .run();

      return json({ success: true });
    } catch (error) {
      console.error('Error adding student to agent:', error);
      return json({ error: 'Errore nell\'aggiunta dello studente' }, { status: 500 });
    }
  }

  // DELETE - Remove student from agent
  if (request.method === 'DELETE') {
    try {
      const body = await request.json();
      const { studentId } = body;

      if (!studentId) {
        return json({ error: 'ID studente obbligatorio' }, { status: 400 });
      }

      const db = env.DB as D1Database;

      // Remove agent link from student
      await db
        .prepare('UPDATE students SET agent_id = NULL WHERE id = ? AND agent_id = ?')
        .bind(studentId, agentId)
        .run();

      return json({ success: true });
    } catch (error) {
      console.error('Error removing student from agent:', error);
      return json({ error: 'Errore nella rimozione dello studente' }, { status: 500 });
    }
  }

  return json({ error: 'Metodo non supportato' }, { status: 405 });
};
