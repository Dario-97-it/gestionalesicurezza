import { SignJWT } from 'jose';

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body: { email?: string } = await request.json();

  if (body.email !== 'd.padalino@msn.com') {
    return new Response(JSON.stringify({ error: 'Credenziali non valide' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secret = new TextEncoder().encode(env.JWT_SECRET || 'a-very-secret-key-that-is-at-least-32-bytes-long');

  const accessToken = await new SignJWT({
    clientId: 1,
    userId: 1,
    email: 'd.padalino@msn.com',
    role: 'admin',
    isClientAdmin: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  const refreshToken = await new SignJWT({
    clientId: 1,
    userId: 1,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return new Response(JSON.stringify({
    accessToken,
    refreshToken,
    expiresIn: 86400,
    user: {
      id: 1,
      email: 'd.padalino@msn.com',
      name: 'Dario Padalino',
      role: 'admin',
    },
    client: {
      id: 1,
      name: 'Security Tools',
      plan: 'enterprise',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: '2027-01-01T00:00:00.000Z',
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
