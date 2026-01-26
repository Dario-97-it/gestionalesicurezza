/**
 * Middleware - Autenticazione JWT
 * Verifica il token JWT e passa il contesto autenticato alle route
 */



interface Env {
  JWT_SECRET: string;
  DB: D1Database;
  SESSIONS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
}

interface AuthContext {
  clientId: number;
  userId: number;
  email: string;
  role: string;
  isClientAdmin: boolean;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Middleware disabilitato per Cloudflare Pages (nessun sistema di autenticazione configurato)
  // Tutti gli endpoint sono pubblici
  return context.next();
};
