import nodemailer from 'nodemailer';

interface Env {
  DB: D1Database;
}

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

    // Tenta di connettersi a Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password
      }
    });

    try {
      await transporter.verify();
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Connessione riuscita'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      // Se l'errore è dovuto a 2FA, richiedi il codice
      if (error.message && error.message.includes('2FA') || error.message.includes('Application-specific')) {
        return new Response(JSON.stringify({ 
          error: 'Autenticazione a 2 fattori richiesta'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        error: 'Credenziali non valide'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    console.error('Error testing email:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore nel test della connessione',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
