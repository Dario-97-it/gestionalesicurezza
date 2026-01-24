import { Env, AuthenticatedRequest } from '../../_middleware';
import { agents } from '../../../drizzle/schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const clientId = request.clientId;
  const agentId = parseInt(context.params.id as string);
  
  if (!clientId) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as { name: string; email?: string; phone?: string; notes?: string };
    const db = drizzle(context.env.DB);
    
    const result = await db.update(agents)
      .set({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        notes: body.notes || null,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(agents.id, agentId), eq(agents.clientId, clientId)))
      .returning();
    
    return new Response(JSON.stringify({ success: true, data: result[0] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Errore aggiornamento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const clientId = request.clientId;
  const agentId = parseInt(context.params.id as string);
  
  if (!clientId) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = drizzle(context.env.DB);
    
    await db.delete(agents)
      .where(and(eq(agents.id, agentId), eq(agents.clientId, clientId)));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Errore eliminazione' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
