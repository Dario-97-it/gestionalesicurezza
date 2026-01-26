import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  SUBSCRIPTIONS: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Temporaneamente bypassato per test
  return new Response(JSON.stringify({
    user: {
      id: 1,
      email: 'd.padalino@msn.com',
      name: 'Dario Padalino (Admin)',
      role: 'admin',
      isClientAdmin: true,
    },
    client: {
      id: 1,
      name: 'Security Tools',
      email: 'd.padalino@msn.com',
      plan: 'enterprise',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: '2027-01-01T00:00:00.000Z',
      maxUsers: 999,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
