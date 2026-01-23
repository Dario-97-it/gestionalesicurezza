interface Env {
  DB: D1Database;
}

// Funzione per criptare (semplice base64 - in produzione usare una libreria robusta)
const encrypt = (text: string): string => {
  return btoa(unescape(encodeURIComponent(text)));
};

// Funzione per decriptare
const decrypt = (encrypted: string): string => {
  try {
    return decodeURIComponent(escape(atob(encrypted)));
  } catch {
    return encrypted;
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = context.data.auth as { clientId: number } | undefined;
    
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json() as {
      email: string;
      resendApiKey?: string;
    };

    const { email, resendApiKey } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email richiesta' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Criptare le credenziali
    const encryptedApiKey = resendApiKey ? encrypt(resendApiKey) : null;

    // Verifica se esiste già un record
    const existing = await context.env.DB.prepare(`
      SELECT id FROM emailSettings WHERE clientId = ?
    `).bind(auth.clientId).first();

    if (existing) {
      // Aggiorna
      await context.env.DB.prepare(`
        UPDATE emailSettings 
        SET email = ?, resendApiKey = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE clientId = ?
      `).bind(email, encryptedApiKey, auth.clientId).run();
    } else {
      // Inserisci
      await context.env.DB.prepare(`
        INSERT INTO emailSettings (clientId, email, resendApiKey, createdAt, updatedAt)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(auth.clientId, email, encryptedApiKey).run();
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Impostazioni email salvate con successo'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error saving email settings:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore nel salvataggio delle impostazioni',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const auth = context.data.auth as { clientId: number } | undefined;
    
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await context.env.DB.prepare(`
      SELECT email, resendApiKey FROM emailSettings WHERE clientId = ?
    `).bind(auth.clientId).first() as any;

    if (!result) {
      return new Response(JSON.stringify({ 
        email: null,
        hasResendApiKey: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      email: result.email,
      hasResendApiKey: !!result.resendApiKey
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error getting email settings:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore nel recupero delle impostazioni',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
