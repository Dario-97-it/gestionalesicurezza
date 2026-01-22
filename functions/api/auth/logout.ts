/**
 * API Logout - Terminazione sessione
 * POST /api/auth/logout
 */

interface Env {
  SESSIONS: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Estrai token dall'header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      // Elimina sessione da KV
      const sessionKey = `session:${token.slice(-32)}`;
      await env.SESSIONS.delete(sessionKey);
    }

    // Prova a eliminare anche il refresh token se fornito
    try {
      const body = await request.json() as any;
      if (body.refreshToken) {
        const refreshKey = `refresh:${body.refreshToken.slice(-32)}`;
        await env.SESSIONS.delete(refreshKey);
      }
    } catch {
      // Ignora se non c'è body
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
