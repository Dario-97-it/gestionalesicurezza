# Analisi Requisiti GestionaleSicurezza 2026

Basato sul documento operativo `GESTIONALECOMEVAFATTO.docx`.

## 1. Analisi SWOT (Punti di Forza e Debolezze)

### Punti di Forza (Attuali)
- **Architettura Serverless**: Già ottimizzata per Cloudflare Pages e D1.
- **Multi-tenancy**: Isolamento dei dati per cliente (`clientId`) già implementato.
- **Validazioni Base**: Sistema di validazione email, P.IVA e date esistente.
- **Export PDF/Excel**: Funzionalità core già presenti nel codice.

### Debolezze (Rispetto ai nuovi requisiti)
- **Logica Automazione CF**: Manca il reverse engineering del Codice Fiscale (estrazione data, sesso, luogo).
- **Validazione Real-time**: Le validazioni attuali sono per lo più post-submit; il documento richiede feedback durante la digitazione (debounce).
- **Gestione Agenti**: Manca completamente il modulo "Agenti" (Pagina 6).
- **Integrazione Fatturazione**: L'integrazione con "Fatture in Cloud" è solo accennata, non implementata operativamente.
- **Dashboard KPI**: Le statistiche attuali sono statiche; serve il filtro temporale dinamico (Mese/Trimestre/Anno).
- **Iscrizioni Batch**: La logica attuale è semplificata; serve il flusso guidato per azienda.

---

## 2. Modifiche Architetturali per Cloudflare (2026 Ready)

Per rendere la repository "perfetta per Cloudflare", implementeremo le seguenti ottimizzazioni:

### A. Backend (Cloudflare Workers / D1)
- **D1 Optimization**: Aggiunta di indici specifici per la ricerca "live" (debounce) su CF, P.IVA e Ragione Sociale per garantire risposte sotto i 50ms.
- **Cron Triggers**: Implementazione di un Worker periodico per lo **Scadenzario**, che invia notifiche automatiche senza intervento umano.
- **KV Store**: Utilizzo più intensivo di KV per memorizzare i template delle email e le configurazioni SMTP/Resend per evitare query al DB ad ogni invio.

### B. Frontend (React 18 + Vite)
- **Debounced Search Hooks**: Implementazione di hook custom per tutte le ricerche live.
- **CF Logic Utility**: Nuova libreria `src/lib/codiceFiscale.ts` per l'auto-fill dei dati anagrafici.
- **Global State**: Ottimizzazione del context per gestire i filtri temporali della Dashboard in modo reattivo.

---

## 3. Piano di Riprogettazione (Step-by-Step)

### Fase 1: Aggiornamento Schema Database (Drizzle)
- [ ] Aggiunta tabella `agents`.
- [ ] Aggiunta campi mancanti in `companies` (Codice Ateco, Agente, Codice Univoco).
- [ ] Aggiunta campi in `students` (Mansione, Ateco specifico).
- [ ] Aggiunta tabella `invoices` per tracciare lo stato dei pagamenti.

### Fase 2: Implementazione Logica Intelligente
- [ ] Sviluppo utility Codice Fiscale (Reverse Engineering).
- [ ] Implementazione controllo duplicati real-time via API dedicata.

### Fase 3: UI/UX & Dashboard
- [ ] Refactoring Dashboard con grafici Recharts e filtri temporali.
- [ ] Creazione pagina "Dettaglio Azienda" (Icona Occhio) con KPI specifiche.

### Fase 4: Automazione & Export
- [ ] Potenziamento modulo iCalendar (.ics).
- [ ] Implementazione Iscrizioni Batch guidate.

---

## 4. Proposta Cambio Repository
Consiglio di strutturare la repository con una chiara separazione tra `logic` (validazioni e calcoli 81/08) e `ui`, rendendo la logica testabile indipendentemente dall'interfaccia.
