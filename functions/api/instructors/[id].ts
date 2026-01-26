import { Router } from 'itty-router';
import { json } from 'itty-router';

const router = Router();

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  // GET single instructor
  if (request.method === 'GET') {
    try {
      const db = env.DB as D1Database;
      const instructor = await db
        .prepare('SELECT * FROM instructors WHERE id = ?')
        .bind(id)
        .first();

      if (!instructor) {
        return json({ error: 'Docente non trovato' }, { status: 404 });
      }

      return json(instructor);
    } catch (error) {
      return json({ error: 'Errore nel recupero del docente' }, { status: 500 });
    }
  }

  // PUT update instructor
  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const db = env.DB as D1Database;

      const { firstName, lastName, email, phone, specialization, notes } = body;

      await db
        .prepare(
          `UPDATE instructors 
           SET firstName = ?, lastName = ?, email = ?, phone = ?, specialization = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .bind(firstName, lastName, email, phone, specialization, notes, id)
        .run();

      const updated = await db
        .prepare('SELECT * FROM instructors WHERE id = ?')
        .bind(id)
        .first();

      return json(updated);
    } catch (error) {
      console.error('Error updating instructor:', error);
      return json({ error: 'Errore nell\'aggiornamento del docente' }, { status: 500 });
    }
  }

  // DELETE instructor
  if (request.method === 'DELETE') {
    try {
      const db = env.DB as D1Database;

      await db
        .prepare('DELETE FROM instructors WHERE id = ?')
        .bind(id)
        .run();

      return json({ success: true });
    } catch (error) {
      console.error('Error deleting instructor:', error);
      return json({ error: 'Errore nell\'eliminazione del docente' }, { status: 500 });
    }
  }

  return json({ error: 'Metodo non supportato' }, { status: 405 });
};
