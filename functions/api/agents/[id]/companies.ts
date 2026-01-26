import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../../../drizzle/schema';

interface Env {
  DB: D1Database;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const auth = context.data.auth as AuthContext;
  const agentId = parseInt(params.id as string);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = drizzle(env.DB, { schema });

    // Fetch companies associated with this agent
    const companies = await db.select()
      .from(schema.companies)
      .where(
        eq(schema.companies.agentId, agentId)
      );

    return new Response(JSON.stringify({ 
      companies: companies || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching agent companies:', error);
    return new Response(JSON.stringify({ error: 'Errore nel caricamento delle aziende' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const agentId = parseInt(params.id as string);

  try {
    const body = await request.json() as any;
    const { companyId } = body;

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'ID azienda obbligatorio' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = drizzle(env.DB, { schema });

    // Update company to link to agent
    await db.update(schema.companies)
      .set({ agentId })
      .where(eq(schema.companies.id, companyId));

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error adding company to agent:', error);
    return new Response(JSON.stringify({ error: 'Errore nell\'aggiunta dell\'azienda', details: error.message }), { 
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
    const { companyId } = body;

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'ID azienda obbligatorio' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = drizzle(env.DB, { schema });

    // Remove agent link from company
    await db.update(schema.companies)
      .set({ agentId: null })
      .where(eq(schema.companies.id, companyId));

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error removing company from agent:', error);
    return new Response(JSON.stringify({ error: 'Errore nella rimozione dell\'azienda', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
