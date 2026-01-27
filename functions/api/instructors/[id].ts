export const onRequestGet: PagesFunction = async (context) => {
  const { env } = context;
  const url = new URL(context.request.url);
  const id = url.pathname.split('/').pop();

  try {
    const db = env.DB as D1Database;
    const instructor = await db
      .prepare('SELECT * FROM instructors WHERE id = ?')
      .bind(id)
      .first();

    if (!instructor) {
      return new Response(JSON.stringify({ error: 'Docente non trovato' }), { status: 404 });
    }

    return new Response(JSON.stringify(instructor), { status: 200 });
  } catch (error) {
    console.error('Error fetching instructor:', error);
    return new Response(JSON.stringify({ error: 'Errore nel recupero del docente' }), { status: 500 });
  }
};

export const onRequestPut: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  try {
    const body = await request.json();
    const db = env.DB as D1Database;

    const { firstName, lastName, email, phone, hourlyRate, notes, status } = body;

    await db
      .prepare(
        `UPDATE instructors 
         SET firstName = ?, lastName = ?, email = ?, phone = ?, hourlyRate = ?, notes = ?, status = ?, updatedAt = ?
         WHERE id = ?`
      )
      .bind(firstName, lastName, email, phone, hourlyRate, notes, status, new Date().toISOString(), id)
      .run();

    const updated = await db
      .prepare('SELECT * FROM instructors WHERE id = ?')
      .bind(id)
      .first();

    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (error) {
    console.error('Error updating instructor:', error);
    return new Response(JSON.stringify({ error: 'Errore nell\'aggiornamento del docente' }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction = async (context) => {
  const { env } = context;
  const url = new URL(context.request.url);
  const id = url.pathname.split('/').pop();

  try {
    const db = env.DB as D1Database;

    await db
      .prepare('DELETE FROM instructors WHERE id = ?')
      .bind(id)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error deleting instructor:', error);
    return new Response(JSON.stringify({ error: 'Errore nell\'eliminazione del docente' }), { status: 500 });
  }
};
