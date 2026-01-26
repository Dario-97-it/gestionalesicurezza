export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const agentId = pathParts[pathParts.length - 3];

  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'ID studente obbligatorio' }), { status: 400 });
    }

    const db = env.DB as D1Database;

    // Update student to link to agent
    await db
      .prepare('UPDATE students SET agent_id = ? WHERE id = ?')
      .bind(agentId, studentId)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error adding student to agent:', error);
    return new Response(JSON.stringify({ error: 'Errore nell\'aggiunta dello studente' }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const agentId = pathParts[pathParts.length - 3];

  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'ID studente obbligatorio' }), { status: 400 });
    }

    const db = env.DB as D1Database;

    // Remove agent link from student
    await db
      .prepare('UPDATE students SET agent_id = NULL WHERE id = ? AND agent_id = ?')
      .bind(studentId, agentId)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error removing student from agent:', error);
    return new Response(JSON.stringify({ error: 'Errore nella rimozione dello studente' }), { status: 500 });
  }
};
