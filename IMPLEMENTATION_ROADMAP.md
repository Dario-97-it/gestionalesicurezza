# 🚀 GestionaleSicurezza - Implementation Roadmap 2026

## 📊 Analisi Comparativa Completa

### Pagina 1: Dashboard ✅ (80% Implementato)
**Cosa c'è:**
- KPI base (Aziende, Studenti, Corsi, Docenti)
- Statistiche mensili e annuali
- Widget "Prossime Edizioni" e "Ultime Iscrizioni"
- Alert scadenze attestati con urgency badges
- Grafico andamento iscrizioni

**Cosa manca:**
- ❌ Widget "Edizioni in Partenza Oggi" (alert real-time per operatività quotidiana)
- ❌ Quick action "Crea Iscrizione Rapida" (wizard)
- ❌ Integrazione con Calendario per mostrare sessioni di oggi

**Priorità:** 🟡 MEDIA (migliora UX ma non critica)

---

### Pagina 2: Aziende ✅ (85% Implementato)
**Cosa c'è:**
- Full CRUD (Create, Read, Update, Delete)
- Validazione P.IVA con reverse lookup
- Dettaglio azienda con storico
- Filtri e ricerca
- Collegamento agente commerciale

**Cosa manca:**
- ❌ Integrazione Fatture in Cloud (API per invio dati fatturazione)
- ❌ Campo "Categoria Cliente" (PMI, Multinazionale, Pubblica)
- ❌ Storico fatturazioni e pagamenti
- ❌ Bulk import da Excel con template

**Priorità:** 🟠 ALTA (Fatture in Cloud è richiesto dalla spec)

---

### Pagina 3: Studenti ✅ (90% Implementato)
**Cosa c'è:**
- Full CRUD
- **Reverse Codice Fiscale** (auto-fill data nascita, luogo, genere) ⭐ ECCELLENTE
- Dettaglio studente con storico corsi
- Filtri per azienda, corso, stato
- Trasferimento tra aziende

**Cosa manca:**
- ❌ Campo "Mansione" (es. "Operaio", "Impiegato") - IMPORTANTE per 81/08
- ❌ Campo "Livello Rischio" (Basso, Medio, Alto) - CRITICO per 81/08
- ❌ Caricamento foto/documento identità
- ❌ Storico scadenze attestati per studente

**Priorità:** 🔴 CRITICA (Campi 81/08 sono obbligatori)

---

### Pagina 4: Servizi Offerti ✅ (70% Implementato)
**Cosa c'è:**
- Catalogo corsi base
- CRUD corso
- Descrizione e durata

**Cosa manca:**
- ❌ Prezzi differenziati per categoria cliente (es. PMI vs Multinazionale)
- ❌ Validità automatica (es. "Aggiornamento valido 5 anni")
- ❌ Prerequisiti (es. "Aggiornamento richiede corso Base")
- ❌ Ore minime obbligatorie per certificazione

**Priorità:** 🟠 ALTA (Validità e prerequisiti sono critici per 81/08)

---

### Pagina 5: Docenti ✅ (75% Implementato)
**Cosa c'è:**
- Anagrafica docente
- Tracking ore insegnate
- Tariffe orarie

**Cosa manca:**
- ❌ Caricamento CV/Attestati docente
- ❌ Scadenze titoli docente (es. "Attestato scade 31/12/2026")
- ❌ Sincronizzazione Google Calendar (invio sessioni a calendario docente)
- ❌ Storico corsi tenuti e valutazioni

**Priorità:** 🟡 MEDIA (Importante per compliance ma non blocca operatività)

---

### Pagina 6: Agenti ✅ (80% Implementato)
**Cosa c'è:**
- Gestione commerciale agenti
- Tracciamento studenti/aziende portati
- Collegamento a studenti e aziende

**Cosa manca:**
- ❌ Calcolo provvigioni automatico (% su iscrizioni)
- ❌ Report provvigioni per agente
- ❌ Dashboard agente con KPI personali
- ❌ Storico pagamenti provvigioni

**Priorità:** 🟠 ALTA (Importante per gestione commerciale)

---

### Pagina 7: Edizioni ✅ (85% Implementato)
**Cosa c'è:**
- Creazione edizioni corso
- Sessioni frazionate (più giorni/orari)
- Generazione .ics per calendario
- Pianificazione con docenti
- Status tracking

**Cosa manca:**
- ❌ Pulsante "Crea Registro Presenze" istantaneo (ora richiede navigazione)
- ❌ Generazione automatica attestati al raggiungimento ore
- ❌ Sincronizzazione Google Calendar docente (invio invito)
- ❌ Bulk action "Crea Edizione di Recupero" per studenti non idonei

**Priorità:** 🟡 MEDIA (Migliora UX ma non critica)

---

### Pagina 8: Presenze ✅ (80% Implementato)
**Cosa c'è:**
- Registro giornaliero digitale
- Tracciamento presenze per studente
- Calcolo ore totali

**Cosa manca:**
- ❌ Firma digitale semplice (OTP o QR Code) per velocizzare burocrazia
- ❌ Foto presenze (snapshot per audit)
- ❌ Giustificazione assenze
- ❌ Export registro in PDF

**Priorità:** 🟡 MEDIA (Utile ma non blocca)

---

### Pagina 9: Iscrizioni ✅ (85% Implementato)
**Cosa c'è:**
- Iscrizione singola
- **Batch enrollment** (iscrizioni multiple da azienda) ⭐ ECCELLENTE
- Validazione dati
- Stato iscrizione

**Cosa manca:**
- ❌ Controllo automatico prerequisiti (es. non puoi fare "Aggiornamento" se non hai "Base")
- ❌ Wizard iscrizione rapida (CF → Auto-fill → Azienda → Corso → Fine)
- ❌ Validazione automatica livello rischio vs corso
- ❌ Invio email di conferma iscrizione

**Priorità:** 🔴 CRITICA (Wizard è la "scorciatoia" più importante per velocizzare)

---

### Pagina 10: Report ✅ (75% Implementato)
**Cosa c'è:**
- Grafici Recharts
- Export Excel
- KPI base (Studenti, Aziende, Fatturato)
- Andamento mensile
- Top corsi e aziende

**Cosa manca:**
- ❌ Report "Studente da Recuperare" (chi ha fatto <90% ore)
- ❌ Report "Certificati Scaduti" con filtri
- ❌ Report "Provvigioni Agenti" per periodo
- ❌ Export PDF con grafici

**Priorità:** 🟡 MEDIA (Utile per analisi ma non blocca)

---

### Pagina 11: Scadenzario ✅ (80% Implementato)
**Cosa c'è:**
- Tabella scadenze attestati
- Alert colorati per urgenza
- Filtri per azienda/corso

**Cosa manca:**
- ❌ Invio massivo email di avviso scadenza alle aziende
- ❌ Bulk action "Crea Edizione Aggiornamento" per scaduti
- ❌ Integrazione con calendario per reminder automatici
- ❌ Export lista scaduti per comunicazione

**Priorità:** 🟠 ALTA (Importante per compliance 81/08)

---

### Pagina 12: Calendario 🆕 ✅ (100% Implementato)
**Cosa c'è:**
- Vista mensile, settimanale, lista
- Sincronizzazione sessioni edizioni
- Colori differenziati per corso
- Modal con dettagli evento
- Statistiche

**Cosa manca:**
- ❌ Integrazione con Google Calendar (export .ics)
- ❌ Reminder automatici per sessioni
- ❌ Drag-and-drop per spostare sessioni

**Priorità:** 🟢 BASSA (Già funzionante, miglioramenti futuri)

---

## 🎯 Priorità di Implementazione

### 🔴 CRITICA (Blocca operatività)
1. **Wizard Iscrizione Rapida** - Riduce tempo di 70%
2. **Campi 81/08** (Mansione, Livello Rischio) - Compliance
3. **Controllo Prerequisiti** - Validazione logica

### 🟠 ALTA (Importante per operatività)
4. **Integrazione Fatture in Cloud** - Fatturazione
5. **Calcolo Provvigioni Agenti** - Gestione commerciale
6. **Invio Email Scadenze** - Compliance
7. **Sincronizzazione Google Calendar** - Operatività docenti

### 🟡 MEDIA (Migliora UX)
8. **Firma Digitale Presenze** - Velocizza burocrazia
9. **Generazione Automatica Attestati** - Automazione
10. **Report Studenti da Recuperare** - Analisi

---

## 📋 Piano di Implementazione

### FASE 1: Core Compliance (Settimana 1)
- [ ] Aggiungere campi Mansione e Livello Rischio a Students
- [ ] Aggiungere validazione livello rischio vs corso
- [ ] Migrare database con ALTER TABLE

### FASE 2: Wizard Iscrizione Rapida (Settimana 1-2)
- [ ] Creare componente QuickEnrollmentWizard
- [ ] Implementare step: CF → Auto-fill → Azienda → Corso → Conferma
- [ ] Integrare nel Dashboard come quick action

### FASE 3: Automazioni Email (Settimana 2)
- [ ] Implementare API per invio email scadenze (Resend)
- [ ] Creare bulk action "Invia Avviso Scadenza"
- [ ] Aggiungere scheduling automatico

### FASE 4: Integrazioni Esterne (Settimana 3)
- [ ] Integrazione Fatture in Cloud API
- [ ] Sincronizzazione Google Calendar
- [ ] Calcolo provvigioni agenti

### FASE 5: Report Avanzati (Settimana 3-4)
- [ ] Report "Studenti da Recuperare"
- [ ] Report "Certificati Scaduti"
- [ ] Export PDF con grafici

---

## 🛠️ Stack Tecnologico Necessario

- **Email**: Resend API (già configurato)
- **PDF**: jsPDF (già installato)
- **Excel**: XLSX (già installato)
- **Calendar**: Google Calendar API (da configurare)
- **Invoicing**: Fatture in Cloud API (da integrare)

---

## 📈 Metriche di Successo

- ✅ Tempo iscrizione ridotto da 5 minuti a 1 minuto (Wizard)
- ✅ 100% compliance D.Lgs. 81/08 (Campi obbligatori)
- ✅ 0 errori di prerequisiti (Validazione)
- ✅ Email scadenze inviate automaticamente
- ✅ Provvigioni calcolate automaticamente

---

## 🚀 Prossimi Passi

1. Implementare FASE 1 (Campi 81/08)
2. Implementare FASE 2 (Wizard Iscrizione)
3. Testare e deployare su Cloudflare Pages
4. Raccogliere feedback utenti
5. Iterare su FASE 3-5

