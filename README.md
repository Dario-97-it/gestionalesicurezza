# GestionaleSicurezza - Gestionale Corsi Sicurezza D.Lgs. 81/08

Gestionale completo per la gestione di corsi di formazione sulla sicurezza sul lavoro, ottimizzato per Cloudflare Pages.

## Caratteristiche

- **Multi-tenant**: Ogni cliente ha i propri dati isolati
- **Gestione abbonamenti**: Sistema di abbonamenti con disabilitazione automatica
- **Autenticazione JWT**: Sicurezza enterprise-grade
- **Serverless**: Nessun server da gestire, scalabilità automatica
- **Edge Computing**: Latenza minima grazie a Cloudflare's global network

## Stack Tecnologico

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: JWT + Cloudflare KV
- **Cache**: Cloudflare KV

## Requisiti

- Node.js 18+
- pnpm (consigliato) o npm
- Account Cloudflare (gratuito)
- Wrangler CLI

## Setup Iniziale

### 1. Clona il repository

```bash
git clone https://github.com/YOUR_USERNAME/securitytools.git
cd securitytools
```

### 2. Installa le dipendenze

```bash
pnpm install
```

### 3. Configura Cloudflare

```bash
# Login a Cloudflare
npx wrangler login

# Crea il database D1
npx wrangler d1 create securitytools-db

# Crea i KV namespaces
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create SUBSCRIPTIONS
```

### 4. Aggiorna wrangler.toml

Copia gli ID generati nel file `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gestionalesicurezza"
database_id = "bf929649-0ce9-4715-b440-dea458b36c76"

[[kv_namespaces]]
binding = "SESSIONS"
id = "81d32bda77214ae192ee7848f9c817f4"

[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "ee17c3df58ac4303a455eaf735f13738"
```

### 5. Configura i secrets

```bash
# JWT Secret (genera con: openssl rand -base64 32)
npx wrangler secret put JWT_SECRET

# Admin Secret Key (per gestire abbonamenti)
npx wrangler secret put ADMIN_SECRET_KEY
```

### 6. Esegui le migrazioni

```bash
# Locale
npx wrangler d1 execute securitytools-db --local --file=./drizzle/0000_init.sql

# Produzione
npx wrangler d1 execute securitytools-db --file=./drizzle/0000_init.sql
```

### 7. Crea il primo cliente (admin)

```bash
# Usa l'API admin o esegui manualmente
npx wrangler d1 execute securitytools-db --command="INSERT INTO clients (email, passwordHash, name, plan, subscriptionStatus, createdAt, updatedAt) VALUES ('admin@example.com', 'YOUR_HASHED_PASSWORD', 'Admin', 'enterprise', 'active', datetime('now'), datetime('now'));"
```

## Sviluppo Locale

```bash
# Avvia il frontend
pnpm dev

# In un altro terminale, avvia il backend
pnpm pages:dev
```

L'applicazione sarà disponibile su:
- Frontend: http://localhost:5173
- Backend: http://localhost:8788

## Deploy

### Deploy Automatico (consigliato)

1. Collega il repository a Cloudflare Pages
2. Configura le variabili d'ambiente
3. Ogni push su `main` triggera un deploy automatico

### Deploy Manuale

```bash
pnpm pages:deploy
```

## Gestione Abbonamenti

### API Admin

Le API admin richiedono l'header `X-Admin-Key`:

```bash
# Lista clienti
curl -H "X-Admin-Key: YOUR_ADMIN_KEY" https://your-app.pages.dev/api/admin/clients

# Attiva abbonamento
curl -X PUT -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"active","plan":"pro","expiresAt":"2026-12-31"}' \
  https://your-app.pages.dev/api/admin/subscriptions/1

# Disabilita abbonamento
curl -X DELETE -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{"reason":"non-payment"}' \
  https://your-app.pages.dev/api/admin/subscriptions/1
```

## Struttura Progetto

```
securitytools/
├── drizzle/              # Schema database e migrazioni
│   ├── schema.ts         # Definizione tabelle
│   └── 0000_init.sql     # Migrazione iniziale
├── functions/            # Cloudflare Pages Functions
│   ├── _middleware.ts    # Auth middleware
│   └── api/              # API endpoints
│       ├── auth/         # Autenticazione
│       ├── admin/        # API admin
│       ├── companies/    # Gestione aziende
│       ├── students/     # Gestione studenti
│       ├── courses/      # Gestione corsi
│       ├── editions/     # Gestione edizioni
│       ├── registrations/# Gestione iscrizioni
│       ├── attendances/  # Gestione presenze
│       ├── instructors/  # Gestione docenti
│       └── dashboard.ts  # Dashboard stats
├── src/                  # Frontend React
│   ├── components/       # Componenti UI
│   ├── contexts/         # React contexts
│   ├── lib/              # Utilities e API client
│   └── pages/            # Pagine applicazione
├── wrangler.toml         # Configurazione Cloudflare
├── package.json          # Dipendenze
└── vite.config.ts        # Configurazione Vite
```

## Sicurezza

- **Codice sorgente**: Il codice frontend viene minificato e offuscato in produzione
- **API**: Tutte le API richiedono autenticazione JWT
- **Multi-tenant**: I dati sono isolati per cliente tramite `clientId`
- **Abbonamenti**: Verifica automatica dello stato abbonamento ad ogni richiesta

## Supporto

Per assistenza, contatta il supporto tecnico.

## Licenza

Proprietario - Tutti i diritti riservati.
