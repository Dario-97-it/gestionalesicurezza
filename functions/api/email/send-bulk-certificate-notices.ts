/**
 * API Endpoint: Send Bulk Certificate Expiration Notices
 * POST /api/email/send-bulk-certificate-notices
 * 
 * Sends certificate expiration notices to companies about their employees' expiring certificates
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';

interface BulkNoticeRequest {
  companyIds: number[];
}

interface Env {
  RESEND_API_KEY: string;
  DB: D1Database;
  KV: KVNamespace;
}

const router = Router();

/**
 * POST /api/email/send-bulk-certificate-notices
 * Send bulk certificate expiration notices to companies
 */
router.post('/api/email/send-bulk-certificate-notices', async (request: IRequest, env: Env) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: BulkNoticeRequest = await request.json();

    if (!body.companyIds || !Array.isArray(body.companyIds) || body.companyIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or empty companyIds array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;
    let failed = 0;

    // Process each company
    for (const companyId of body.companyIds) {
      try {
        // Get company details
        const companyResult = await env.DB.prepare(
          `SELECT id, name, email FROM companies WHERE id = ?`
        ).bind(companyId).first();

        if (!companyResult) {
          console.warn(`Company ${companyId} not found`);
          failed++;
          continue;
        }

        // Get expiring certificates for this company
        const certificatesResult = await env.DB.prepare(`
          SELECT 
            s.id as studentId,
            s.firstName,
            s.lastName,
            c.title as courseTitle,
            r.id as registrationId,
            CAST(
              (julianday(r.certificateExpiryDate) - julianday('now')) AS INTEGER
            ) as daysUntilExpiry,
            r.certificateExpiryDate as expiryDate
          FROM registrations r
          JOIN students s ON r.studentId = s.id
          JOIN courses c ON r.courseId = c.id
          WHERE r.companyId = ?
            AND r.certificateExpiryDate IS NOT NULL
            AND julianday(r.certificateExpiryDate) > julianday('now')
            AND julianday(r.certificateExpiryDate) <= julianday('now', '+90 days')
          ORDER BY r.certificateExpiryDate ASC
        `).bind(companyId).all();

        const certificates = certificatesResult.results || [];

        if (certificates.length === 0) {
          console.log(`No expiring certificates for company ${companyId}`);
          continue;
        }

        // Prepare email content
        const certificateRows = certificates.map((cert: any) => {
          const daysUntilExpiry = cert.daysUntilExpiry;
          let urgency = 'low';
          if (daysUntilExpiry <= 30) urgency = 'high';
          else if (daysUntilExpiry <= 60) urgency = 'medium';

          return {
            studentName: `${cert.firstName} ${cert.lastName}`,
            courseTitle: cert.courseTitle,
            expiryDate: new Date(cert.expiryDate).toLocaleDateString('it-IT'),
            daysUntilExpiry,
            urgency,
          };
        });

        // Generate HTML email
        const htmlContent = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #d97706;">⚠️ Certificati di Sicurezza in Scadenza</h2>
                
                <p>Gentile <strong>${companyResult.name}</strong>,</p>
                
                <p>Vi comunichiamo che i seguenti certificati di sicurezza dei vostri dipendenti sono in scadenza:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <thead>
                    <tr style="background-color: #f3f4f6;">
                      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Dipendente</th>
                      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Corso</th>
                      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Scadenza</th>
                      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Urgenza</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${certificateRows.map((cert: any) => `
                      <tr>
                        <td style="border: 1px solid #d1d5db; padding: 10px;">${cert.studentName}</td>
                        <td style="border: 1px solid #d1d5db; padding: 10px;">${cert.courseTitle}</td>
                        <td style="border: 1px solid #d1d5db; padding: 10px;">${cert.expiryDate}</td>
                        <td style="border: 1px solid #d1d5db; padding: 10px;">
                          <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;
                            ${cert.urgency === 'high' ? 'background-color: #fee2e2; color: #991b1b;' : 
                              cert.urgency === 'medium' ? 'background-color: #fef3c7; color: #92400e;' : 
                              'background-color: #dcfce7; color: #166534;'}">
                            ${cert.urgency === 'high' ? '🔴 URGENTE' : cert.urgency === 'medium' ? '🟡 IMPORTANTE' : '🟢 PIANIFICARE'}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                
                <p>
                  Si consiglia di contattarci al più presto per iscrivere i dipendenti ai corsi di aggiornamento necessari.
                </p>
                
                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                  Questo è un messaggio automatico dal Sistema di Gestione Sicurezza D.Lgs. 81/08.
                  <br/>Non rispondere a questa email.
                </p>
              </div>
            </body>
          </html>
        `;

        // Send email via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@gestionalesicurezza.it',
            to: companyResult.email || 'info@' + companyResult.name.toLowerCase().replace(/\s+/g, ''),
            subject: `Certificati di Sicurezza in Scadenza - ${companyResult.name}`,
            html: htmlContent,
          }),
        });

        if (resendResponse.ok) {
          sent++;
          console.log(`Certificate notice sent to company ${companyId}`);
        } else {
          failed++;
          const error = await resendResponse.json();
          console.error(`Failed to send to company ${companyId}:`, error);
        }
      } catch (err: any) {
        failed++;
        console.error(`Error processing company ${companyId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: body.companyIds.length,
        message: `Bulk certificate notices sent: ${sent} succeeded, ${failed} failed`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in bulk certificate notices endpoint:', error);
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
