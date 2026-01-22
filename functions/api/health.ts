/**
 * API Health Check - Verifica stato servizio
 * GET /api/health - Stato del servizio
 */

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  
  const checks: Record<string, boolean> = {
    api: true,
    database: false,
    kv: false,
  };

  // Test database
  try {
    await env.DB.prepare('SELECT 1').first();
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Test KV
  try {
    await env.SESSIONS.put('health-check', 'ok', { expirationTtl: 60 });
    const value = await env.SESSIONS.get('health-check');
    checks.kv = value === 'ok';
  } catch (error) {
    console.error('KV health check failed:', error);
  }

  const allHealthy = Object.values(checks).every(v => v);

  return new Response(JSON.stringify({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  }), {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
};
