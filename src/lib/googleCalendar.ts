/**
 * Google Calendar Integration
 * 
 * Struttura preparata per la sincronizzazione bidirezionale con Google Calendar.
 * Richiede configurazione OAuth 2.0 in Google Cloud Console.
 * 
 * SETUP RICHIESTO:
 * 1. Creare progetto in Google Cloud Console
 * 2. Abilitare Google Calendar API
 * 3. Creare credenziali OAuth 2.0
 * 4. Configurare redirect URI
 * 5. Aggiungere variabili ambiente:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_REDIRECT_URI
 */

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Google Calendar Service
 * 
 * NOTA: Questa è una struttura preparata. L'implementazione completa
 * richiede la configurazione OAuth in Google Cloud Console.
 */
export class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private tokens: GoogleTokens | null = null;

  constructor(config: GoogleCalendarConfig) {
    this.config = config;
  }

  /**
   * Genera URL per autorizzazione OAuth
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Scambia authorization code per tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.tokens;
  }

  /**
   * Rinnova access token usando refresh token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokens.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    this.tokens = {
      ...this.tokens,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  /**
   * Verifica se il token è scaduto
   */
  isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt - 60000; // 1 minuto di margine
  }

  /**
   * Ottiene access token valido
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }

    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  /**
   * Crea evento nel calendario
   */
  async createEvent(calendarId: string, event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create calendar event');
    }

    return response.json();
  }

  /**
   * Aggiorna evento nel calendario
   */
  async updateEvent(calendarId: string, eventId: string, event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update calendar event');
    }

    return response.json();
  }

  /**
   * Elimina evento dal calendario
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Lista eventi dal calendario
   */
  async listEvents(
    calendarId: string,
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 100
  ): Promise<GoogleCalendarEvent[]> {
    const accessToken = await this.getValidAccessToken();

    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (timeMin) {
      params.set('timeMin', timeMin.toISOString());
    }
    if (timeMax) {
      params.set('timeMax', timeMax.toISOString());
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list calendar events');
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Imposta tokens (per ripristino da database)
   */
  setTokens(tokens: GoogleTokens): void {
    this.tokens = tokens;
  }

  /**
   * Ottiene tokens correnti
   */
  getTokens(): GoogleTokens | null {
    return this.tokens;
  }
}

/**
 * Crea istanza del servizio Google Calendar
 * 
 * NOTA: Richiede configurazione delle variabili ambiente
 */
export function createGoogleCalendarService(): GoogleCalendarService | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.warn('Google Calendar integration not configured. Set VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_SECRET, and VITE_GOOGLE_REDIRECT_URI.');
    return null;
  }

  return new GoogleCalendarService({
    clientId,
    clientSecret,
    redirectUri,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });
}

/**
 * Converte sessione corso in evento Google Calendar
 */
export function sessionToGoogleEvent(
  courseName: string,
  sessionDate: string,
  startTime: string,
  endTime: string,
  location?: string,
  instructorEmail?: string,
  description?: string
): GoogleCalendarEvent {
  return {
    summary: `Corso: ${courseName}`,
    description: description || `Sessione formativa: ${courseName}`,
    location,
    start: {
      dateTime: `${sessionDate}T${startTime}:00`,
      timeZone: 'Europe/Rome',
    },
    end: {
      dateTime: `${sessionDate}T${endTime}:00`,
      timeZone: 'Europe/Rome',
    },
    attendees: instructorEmail ? [{ email: instructorEmail }] : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 1440 }, // 1 giorno prima
        { method: 'popup', minutes: 60 },   // 1 ora prima
      ],
    },
  };
}

export default GoogleCalendarService;
