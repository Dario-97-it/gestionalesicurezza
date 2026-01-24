# SPECIFICHE DEFINITIVE: GestionaleSicurezza 2026
**Progetto Consolidato (D.Lgs. 81/08)**

Questo documento unifica e armonizza tutti i requisiti operativi, funzionali e tecnici estratti dai documenti di specifica. Rappresenta la guida definitiva per lo sviluppo del software.

---

## 1. VISIONE E ARCHITETTURA UI/UX
Il sistema è un'applicazione **Cloudflare-native**, progettata per essere **UI/UX Oriented**, responsive e moderna (Stato dell'arte 2026).

### Principi Guida:
- **Validazioni Real-Time**: Feedback immediato durante l'input (es. P.IVA, CF).
- **Debounce Search (300ms)**: Ricerche fluide senza sovraccarico server.
- **Feedback Visivo**: Utilizzo di Skeleton Loaders e Toast Notifications.
- **Marcatura Rapida**: Cambio stato presenze/iscrizioni con click singolo.

---

## 2. STRUTTURA DELLE PAGINE (Le 11 Pagine Richieste)

### PAGINA 1: DASHBOARD (Panoramica KPI)
Visione d'insieme immediata con filtri temporali (Mese, Trimestre, Anno, Totale).
- **KPI Cards**: Aziende, Studenti, Corsi, Docenti, Fatturato (Mese/Totale), Edizioni in corso/programmate.
- **Widget Prossime Edizioni**: Elenco partenze imminenti con corso e numero iscritti.
- **Grafici Recharts**: Andamento Iscrizioni, Fatturato mensile, Corsi più richiesti.

### PAGINA 2: AZIENDE (Full CRUD)
Gestione anagrafica aziende clienti con identificativo univoco (P.IVA o CF per ditte individuali).
- **Dettaglio Azienda (Icona Occhio)**: Pagina dedicata con KPI specifiche (Dipendenti iscritti, corsi frequentati, tasso presenza, spesa totale).
- **Funzionalità**: Storico corsi dipendenti, storico fatture (Saldato/Parziale/Da saldare), export report personalizzato.
- **Campi**: Ragione Sociale, P.IVA (validazione real-time e duplicati), Codice Ateco, Referente, Agente Commerciale, Note.

### PAGINA 3: STUDENTI (Full CRUD)
Registro anagrafico completo dei partecipanti.
- **Reverse Engineering Codice Fiscale**: Auto-fill automatico di Data Nascita, Luogo Nascita e Sesso dal CF (16 caratteri).
- **Dettaglio Studente (Icona Occhio)**: Storico corsi con date, badge stato (Completato/In Corso/Cancellato), scadenze certificati.
- **Funzionalità**: Trasferimento Studente (da un'azienda all'altra), Import/Export Excel con template obbligatorio.
- **Campi**: Nome, Cognome, CF (obbligatorio), Azienda, Mansione, Ateco (se specifico), Note.

### PAGINA 4: SERVIZI OFFERTI (Full CRUD)
Catalogo delle tipologie di formazione secondo normativa 81/08.
- **Campi**: Codice, Titolo, Durata (ore), Prezzo Listino, Validità Attestato (mesi - es. 60 per RSPP, 12 per RLS).
- **Stato**: Toggle Attivo/Disattivo per visibilità nei dropdown.

### PAGINA 5: DOCENTI (Full CRUD)
Anagrafica dei formatori con tracking economico.
- **KPI Docente**: Totale edizioni assegnate, Ore docenza, Ricavi generati, Compenso totale (Ore x Tariffa Oraria).
- **Campi**: Nome, Cognome, Email (validazione duplicati), Telefono, Tariffa Oraria (€).

### PAGINA 6: AGENTI (Full CRUD)
Gestione commerciali (persone fisiche o agenzie).
- **Funzionalità**: Collegamento agenti a studenti e aziende per il tracking della provenienza commerciale.

### PAGINA 7: EDIZIONI (Full CRUD - Cuore Operativo)
Gestione delle aule programmate (Public, Private/Dedicata, Multi-azienda).
- **Pianificazione**: Suddivisione in sessioni multiple (es. 4 ore lunedì, 4 ore martedì).
- **Prezzi Dinamici**: Prezzo personalizzato per azienda con badge sconti/maggiorazioni.
- **Automazione .ics**: Generazione file calendario per Google/Outlook e invio automatico via email a studenti e docenti.
- **Azioni**: Gestione Aula (link a Presenze), Fatturazione (link a Fatture in Cloud), Download/Invio .ics.

### PAGINA 8: REGISTRO PRESENZE
Gestione giornaliera delle presenze per ogni edizione.
- **Marcatura Rapida**: Click diretto per ciclare tra Presente/Assente/Ritardo.
- **Vista Calendario Mensile**: Griglia colorata (Verde: tutti presenti, Giallo: parziali, Rosso: assenti).
- **Export**: Generazione PDF registro presenze con legenda e statistiche.

### PAGINA 9: ISCRIZIONI (Batch & Single)
Associazione studenti-edizioni con controllo capienza.
- **Iscrizione Batch (per Azienda)**: Flusso guidato in 4 step (Azienda -> Edizione -> Selezione Dipendenti -> Conferma).
- **Validazioni**: Controllo posti disponibili real-time e blocco duplicati (studente già iscritto).

### PAGINA 10: REPORT & ANALISI
Analisi strategica e controllo di gestione.
- **Report Incarichi Docenti**: Ore totali e compensi maturati.
- **Report Studenti da Recuperare**: Elenco automatico assenti/bocciati da riproporre per nuove edizioni.
- **Analisi Commerciale**: Grafico a torta ricavi per azienda.

### PAGINA 11: IMPOSTAZIONI & INTEGRAZIONI
Configurazione tecnica del sistema.
- **Email SMTP (Resend)**: Configurazione mittente e test connessione.
- **Fatture in Cloud**: Integrazione API (Key + Company ID) per generazione fatture.
- **Google Calendar**: Sistema basato su .ics (no OAuth necessario).

---

## 3. REQUISITI TECNICI CLOUDFLARE (D1 & KV)
- **Database D1**: `gestionalesicurezza` (ID: `bf929649-0ce9-4715-b440-dea458b36c76`)
- **KV SESSIONS**: `81d32bda77214ae192ee7848f9c817f4`
- **KV SUBSCRIPTIONS**: `ee17c3df58ac4303a455eaf735f13738`
- **Build Directory**: `dist`
- **Compatibility Date**: `2024-01-01`
