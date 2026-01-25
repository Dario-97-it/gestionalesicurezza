/**
 * API Endpoint: Send Email via Resend
 * POST /api/email/send
 * 
 * Sends individual emails using the Resend service
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface Env {
  RESEND_API_KEY: string;
  DB: D1Database;
  KV: KVNamespace;
}

const router = Router();

/**
 * POST /api/email/send
 * Send an email via Resend
 */
router.post('/api/email/send', async (request: IRequest, env: Env) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: EmailRequest = await request.json();

    // Validate input
    if (!body.to || !body.subject || !body.html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: body.from || 'noreply@gestionalesicurezza.it',
        to: body.to,
        subject: body.subject,
        html: body.html,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.json();
      console.error('Resend API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await resendResponse.json();

    // Log email sent
    console.log(`Email sent to ${body.to}:`, result.id);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
        message: 'Email sent successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in email send endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

export default router;
