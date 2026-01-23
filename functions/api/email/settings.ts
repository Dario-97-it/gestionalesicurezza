interface Env {
  DB: D1Database;
}

// Funzione per criptare (semplice, in produzione usare una libreria robusta)
const encrypt = (text: string, key: string): string => {
  // Implementazione semplice - in produzione usare crypto-js o simile
  return Buffer.from(text).toString('base64');
};

// Funzione per decriptare
const decrypt = (encrypted: string, key: string): string => {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
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
      password: string;
      twoFactorCode?: string;
    };

    const { email, password, twoFactorCode } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email e password richieste' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Criptare le credenziali
    const encryptedPassword = encrypt(password, 'secret-key');
    const encryptedTwoFactor = twoFactorCode ? encrypt(twoFactorCode, 'secret-key') : null;

    // Salvare nel database
    await context.env.DB.prepare(`
      INSERT OR REPLACE INTO email_settings (client_id, email, password, two_factor_code, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(auth.clientId, email, encryptedPassword, encryptedTwoFactor).run();

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
