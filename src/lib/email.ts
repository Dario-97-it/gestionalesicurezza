/**
 * Email Service Integration with Resend
 * Handles all email notifications for the safety management system
 */

interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: (data: any) => string;
}

/**
 * Email template for certificate expiration warning
 */
const certificateExpirationTemplate: EmailTemplate = {
  name: 'certificate-expiration',
  subject: 'Avviso: Certificato di Sicurezza in Scadenza',
  htmlContent: (data) => `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d97706;">⚠️ Avviso di Scadenza Certificato</h2>
          
          <p>Gentile <strong>${data.companyName}</strong>,</p>
          
          <p>Vi comunichiamo che il seguente certificato di sicurezza è in scadenza:</p>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p><strong>Studente:</strong> ${data.studentName}</p>
            <p><strong>Corso:</strong> ${data.courseTitle}</p>
            <p><strong>Data Scadenza:</strong> ${data.expiryDate}</p>
            <p><strong>Giorni Rimanenti:</strong> ${data.daysUntilExpiry}</p>
          </div>
          
          <p>
            ${data.daysUntilExpiry <= 30 
              ? '<strong style="color: #dc2626;">🔴 URGENTE:</strong> Il certificato scade entro 30 giorni. Si consiglia di iscrivere lo studente al corso di aggiornamento al più presto.'
              : data.daysUntilExpiry <= 60
              ? '<strong style="color: #f59e0b;">🟡 IMPORTANTE:</strong> Il certificato scade entro 60 giorni. Si consiglia di pianificare il corso di aggiornamento.'
              : '<strong style="color: #10b981;">🟢 PIANIFICARE:</strong> Il certificato scade entro 90 giorni. Pianificare il corso di aggiornamento.'
            }
          </p>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Questo è un messaggio automatico dal Sistema di Gestione Sicurezza D.Lgs. 81/08.
            <br/>Non rispondere a questa email.
          </p>
        </div>
      </body>
    </html>
  `,
};

/**
 * Email template for enrollment confirmation
 */
const enrollmentConfirmationTemplate: EmailTemplate = {
  name: 'enrollment-confirmation',
  subject: 'Iscrizione Confermata - Corso di Sicurezza',
  htmlContent: (data) => `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">✓ Iscrizione Confermata</h2>
          
          <p>Gentile <strong>${data.studentName}</strong>,</p>
          
          <p>La tua iscrizione al corso di sicurezza è stata confermata con successo.</p>
          
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p><strong>Corso:</strong> ${data.courseTitle}</p>
            <p><strong>Data Inizio:</strong> ${data.startDate}</p>
            <p><strong>Data Fine:</strong> ${data.endDate}</p>
            <p><strong>Luogo:</strong> ${data.location}</p>
            <p><strong>Docente:</strong> ${data.instructorName}</p>
            <p><strong>Ore Totali:</strong> ${data.durationHours}</p>
          </div>
          
          <p>
            <strong>Cosa Portare:</strong>
            <ul>
              <li>Documento di identità valido</li>
              <li>Abbigliamento comodo</li>
              <li>Materiale per prendere appunti</li>
            </ul>
          </p>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Questo è un messaggio automatico dal Sistema di Gestione Sicurezza D.Lgs. 81/08.
            <br/>Non rispondere a questa email.
          </p>
        </div>
      </body>
    </html>
  `,
};

/**
 * Email template for bulk certificate expiration notice
 */
const bulkCertificateNoticeTemplate: EmailTemplate = {
  name: 'bulk-certificate-notice',
  subject: 'Certificati di Sicurezza in Scadenza - Azione Richiesta',
  htmlContent: (data) => `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d97706;">⚠️ Certificati in Scadenza</h2>
          
          <p>Gentile <strong>${data.companyName}</strong>,</p>
          
          <p>Vi comunichiamo che i seguenti certificati di sicurezza dei vostri dipendenti sono in scadenza:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Studente</th>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Corso</th>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Scadenza</th>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Urgenza</th>
              </tr>
            </thead>
            <tbody>
              ${data.certificates.map((cert: any) => `
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
  `,
};

/**
 * Send email via Resend API
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({
        to,
        subject: template.subject,
        html: template.htmlContent(data),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Errore nell\'invio email' };
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    console.error('Error sending email:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send bulk emails to companies about expiring certificates
 */
export async function sendBulkCertificateNotices(
  companyIds: number[]
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    const response = await fetch('/api/email/send-bulk-certificate-notices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ companyIds }),
    });

    if (!response.ok) {
      throw new Error('Errore nell\'invio email massivo');
    }

    const result = await response.json();
    return { success: true, sent: result.sent, failed: result.failed };
  } catch (err: any) {
    console.error('Error sending bulk notices:', err);
    return { success: false, sent: 0, failed: companyIds.length };
  }
}

/**
 * Send enrollment confirmation email
 */
export async function sendEnrollmentConfirmation(
  studentEmail: string,
  enrollmentData: {
    studentName: string;
    courseTitle: string;
    startDate: string;
    endDate: string;
    location: string;
    instructorName: string;
    durationHours: number;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmail(studentEmail, enrollmentConfirmationTemplate, enrollmentData);
}

/**
 * Send certificate expiration warning
 */
export async function sendCertificateExpirationWarning(
  companyEmail: string,
  expirationData: {
    companyName: string;
    studentName: string;
    courseTitle: string;
    expiryDate: string;
    daysUntilExpiry: number;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmail(companyEmail, certificateExpirationTemplate, expirationData);
}

export { certificateExpirationTemplate, enrollmentConfirmationTemplate, bulkCertificateNoticeTemplate };
