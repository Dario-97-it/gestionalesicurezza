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
      resendApiKey?: string;
    };

    const { email, resendApiKey } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email richiesta' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Se c'è una API key Resend, testa la connessione
    if (resendApiKey) {
      try {
        // Test API Resend verificando la validità della chiave
        const response = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Connessione Resend API riuscita',
            provider: 'resend'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          const errorData = await response.json();
          return new Response(JSON.stringify({ 
            error: 'API Key Resend non valida',
            details: JSON.stringify(errorData)
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error: any) {
        return new Response(JSON.stringify({ 
          error: 'Errore nella verifica della API Key Resend',
          details: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Se non c'è API key, verifica solo che l'email sia valida
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ 
        error: 'Formato email non valido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email configurata (senza API key Resend, le email saranno simulate)',
      provider: 'simulation'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

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
