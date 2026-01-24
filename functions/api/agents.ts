import { Env, AuthenticatedRequest } from '../_middleware';
import { agents } from '../../drizzle/schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const clientId = request.clientId;
  
  if (!clientId) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = drizzle(context.env.DB);
    const result = await db.select().from(agents).where(eq(agents.clientId, clientId));
    
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Errore database' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const request = context.request as AuthenticatedRequest;
  const clientId = request.clientId;
  
  if (!clientId) {
    return new Response(JSON.stringify({ success: false, error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as { name: string; email?: string; phone?: string; notes?: string };
    const db = drizzle(context.env.DB);
    
    const result = await db.insert(agents).values({
      clientId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null
    }).returning();
    
    return new Response(JSON.stringify({ success: true, data: result[0] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Errore creazione agente' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
