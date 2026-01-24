# GestionaleSicurezza - Guida al Deployment

## Prerequisiti

- Node.js 18+ e npm
- Account Cloudflare
- Repository GitHub collegato
- Database D1 Cloudflare configurato

## Variabili di Ambiente

Configurare le seguenti variabili in Cloudflare Pages:

```
JWT_SECRET=<secret-key-sicura>
ADMIN_SECRET_KEY=<admin-secret>
```

Opzionali:
```
RESEND_API_KEY=<api-key-resend>
```

## Deployment Automatico

Il deployment è configurato per avvenire automaticamente su ogni push al branch `main`:

1. Effettua il push del codice a GitHub
2. GitHub Actions esegue i test
3. Cloudflare Pages deploy automaticamente
4. URL: https://gestionalesicurezza.pages.dev

## Deployment Manuale

```bash
# Installa dipendenze
npm install

# Build
npm run build

# Deploy (richiede Wrangler CLI)
npm run deploy
```

## Database Setup

### Creazione tabelle

Le tabelle vengono create automaticamente da Drizzle ORM. Per inizializzare il database:

```bash
# Genera migrazioni
npm run db:generate

# Esegui migrazioni
npm run db:migrate
```

### Seed dati iniziali

```bash
npm run db:seed
```

## Verifica Post-Deploy

1. **Accesso**: Visita https://gestionalesicurezza.pages.dev/login
2. **Credenziali test**: admin@bnetsrl.it / 1234
3. **Dashboard**: Verifica che i dati carichino correttamente
4. **API**: Testa alcuni endpoint con curl o Postman

## Troubleshooting

### Build fallisce
```bash
# Pulisci cache
rm -rf node_modules dist
npm install
npm run build
```

### Errore database
- Verifica che D1 sia configurato in wrangler.toml
- Controlla le credenziali nel .env locale
- Esegui le migrazioni: `npm run db:migrate`

### Errore autenticazione
- Verifica JWT_SECRET in Cloudflare Pages
- Controlla che il token sia valido
- Verifica CORS configuration

### Performance lenta
- Controlla che il build sia ottimizzato
- Verifica le query del database
- Abilita caching dove possibile

## Monitoraggio

### Log
Visualizza i log di Cloudflare Pages:
```bash
wrangler tail
```

### Metriche
- Accedi a Cloudflare Dashboard
- Vai a Pages > gestionalesicurezza
- Visualizza Analytics

### Errori
Configura error tracking (Sentry):
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});
```

## Rollback

Se necessario, rollback a una versione precedente:

1. Vai a Cloudflare Pages > gestionalesicurezza
2. Seleziona "Deployments"
3. Clicca su una versione precedente
4. Clicca "Rollback"

## Backup Database

### Backup manuale
```bash
# Esporta dati
wrangler d1 backup create gestionalesicurezza-db
```

### Backup automatico
Configura backup giornalieri in Cloudflare Dashboard

## Aggiornamenti

### Aggiornare dipendenze
```bash
npm update
npm run build
git commit -am "Update dependencies"
git push
```

### Aggiornare database schema
```bash
# Modifica schema in drizzle/schema.ts
npm run db:generate
npm run db:migrate
git push
```

## Performance Optimization

### Code Splitting
Implementa lazy loading per route:
```typescript
const Reports = lazy(() => import('./pages/Reports'));
```

### Caching
Configura cache headers in wrangler.toml:
```toml
[env.production]
route = "example.com/api/*"
cache = { default_ttl = 3600 }
```

### Database Indexing
Aggiungi indici per query frequenti:
```typescript
courseIdIdx: index("course_id_idx").on(table.courseId),
```

## Sicurezza in Produzione

### HTTPS
Automatico con Cloudflare Pages

### Rate Limiting
Configura in Cloudflare Dashboard:
- Rate Limiting Rules
- Impostare limite per /api/*

### WAF (Web Application Firewall)
Abilita WAF rules in Cloudflare Dashboard

### DDoS Protection
Automatico con Cloudflare

## Compliance

### GDPR
- Implementa data export
- Implementa data deletion
- Privacy policy disponibile

### Backup & Recovery
- Backup giornalieri
- RTO: 1 ora
- RPO: 24 ore

## Checklist Pre-Produzione

- [ ] Tutte le variabili di ambiente configurate
- [ ] Database migrato e testato
- [ ] Build ottimizzato
- [ ] Test passati
- [ ] Nessun console.error
- [ ] Performance accettabile
- [ ] Backup configurato
- [ ] Monitoring abilitato
- [ ] Error tracking configurato
- [ ] SSL/TLS attivo
- [ ] Rate limiting configurato
- [ ] WAF abilitato
