# Piano di Test Dettagliato - SecurityTools v2

## Obiettivo

Questo piano di test è focalizzato sui **casi limite** e sui **flussi di lavoro critici** del gestionale, con particolare attenzione alle nuove validazioni e ottimizzazioni implementate.

---

## 1. Test Iscrizione Studenti

### 1.1 Iscrizione Singola

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| IS-01 | Iscrizione valida | Studente esistente, edizione attiva | Iscrizione creata con successo | Alta |
| IS-02 | Studente già iscritto | Stesso studente, stessa edizione | Errore: "Studente già iscritto" | Alta |
| IS-03 | Edizione al completo | Edizione con posti esauriti | Errore: "Posti esauriti" | Media |
| IS-04 | Prezzo anomalo alto | Prezzo > 150% prezzo corso | Warning: "Prezzo significativamente superiore" | Media |
| IS-05 | Prezzo anomalo basso | Prezzo < 50% prezzo corso | Warning: "Prezzo significativamente inferiore" | Media |
| IS-06 | Prezzo negativo | Prezzo = -100 | Errore: "Il prezzo non può essere negativo" | Alta |

### 1.2 Iscrizione Batch (Import CSV)

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| IB-01 | Import valido | CSV con dati corretti | Tutte le righe importate | Alta |
| IB-02 | Azienda inesistente | ID Azienda non nel database | Errore: "Azienda non trovata" | Alta |
| IB-03 | Email duplicata | Email già presente nel sistema | Errore: "Email già utilizzata" | Alta |
| IB-04 | Codice Fiscale duplicato | CF già presente nel sistema | Errore: "Codice Fiscale già esistente" | Alta |
| IB-05 | CF formato errato | CF con 15 o 17 caratteri | Errore: "Formato Codice Fiscale non valido" | Media |
| IB-06 | Campi obbligatori mancanti | Nome o Cognome vuoti | Errore: "Campo obbligatorio mancante" | Alta |
| IB-07 | File vuoto | CSV senza righe dati | Errore: "File vuoto" | Media |
| IB-08 | File troppo grande | CSV con >1000 righe | Errore: "Limite massimo righe superato" | Media |

---

## 2. Test Trasferimento Studenti

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| TS-01 | Trasferimento valido | Studente A → Azienda B | Trasferimento completato | Alta |
| TS-02 | Stessa azienda | Studente A → Azienda A (attuale) | Errore: "Già associato a questa azienda" | Alta |
| TS-03 | Azienda inesistente | ID azienda non valido | Errore: "Azienda non trovata" | Alta |
| TS-04 | Studente con iscrizioni | Studente con corsi attivi | Warning: "Iscrizioni non modificate" | Media |
| TS-05 | Trasferimento multiplo | Stesso studente trasferito 2 volte | Entrambi i trasferimenti registrati | Media |

---

## 3. Test Emissione Certificati

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| EC-01 | Frequenza sufficiente | Frequenza ≥ 90% | Certificato emesso | Alta |
| EC-02 | Frequenza insufficiente | Frequenza = 85% | Errore: "Frequenza insufficiente (85% < 90%)" | Alta |
| EC-03 | Certificato duplicato | Stesso studente, stesso corso | Errore: "Certificato già emesso" | Alta |
| EC-04 | Data certificato prima fine corso | Data < data fine edizione | Errore: "Data non valida" | Media |
| EC-05 | Data certificato molto dopo | Data > 30gg dopo fine corso | Warning: "Verificare la data" | Bassa |

---

## 4. Test Registro Presenze

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| RP-01 | Segna presente | Click su "Presente" | Stato aggiornato, ore assegnate | Alta |
| RP-02 | Segna assente | Click su "Assente" | Stato aggiornato, ore = 0 | Alta |
| RP-03 | Tutti presenti | Click su "Tutti Presenti" | Tutti gli studenti presenti | Alta |
| RP-04 | Tutti assenti | Click su "Tutti Assenti" | Tutti gli studenti assenti | Alta |
| RP-05 | Export PDF | Click su "Esporta PDF" | File PDF scaricato | Media |
| RP-06 | Export Excel | Click su "Esporta Excel" | File Excel scaricato | Media |
| RP-07 | Nessun iscritto | Edizione senza studenti | Messaggio: "Nessuno studente iscritto" | Media |
| RP-08 | Sessione senza ore | Sessione con hours = 0 | Gestione corretta, no divisione per zero | Alta |

---

## 5. Test Scadenzario Attestati

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| SA-01 | Visualizza scaduti | Attestati con scadenza passata | Badge "SCADUTO da X gg" | Alta |
| SA-02 | Visualizza urgenti | Attestati 0-30 giorni | Badge rosso con giorni | Alta |
| SA-03 | Visualizza in scadenza | Attestati 30-60 giorni | Badge giallo con giorni | Alta |
| SA-04 | Visualizza da pianificare | Attestati 60-90 giorni | Badge verde con giorni | Alta |
| SA-05 | Filtro per urgenza | Seleziona "Urgenti" | Solo attestati urgenti visibili | Media |
| SA-06 | Ricerca testuale | Cerca "Mario Rossi" | Solo attestati di Mario Rossi | Media |
| SA-07 | Export Excel | Click su "Esporta" | File Excel con tutti i dati | Media |
| SA-08 | Nessun attestato | Nessuna scadenza nei prossimi 90gg | Messaggio: "Nessun attestato in scadenza" | Media |

---

## 6. Test Gestione Sessioni

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| GS-01 | Crea sessione valida | Data, orario, ore | Sessione creata | Alta |
| GS-02 | Ore eccessive | Ore sessione > ore corso | Warning: "Ore superano il corso" | Media |
| GS-03 | Conflitto orario | Sessione sovrapposta | Warning: "Sovrapposizione orario" | Media |
| GS-04 | Data nel passato | Data < oggi | Errore: "Data nel passato" | Media |
| GS-05 | Elimina sessione con presenze | Sessione con presenze registrate | Errore: "Eliminare prima le presenze" | Alta |

---

## 7. Test Eliminazioni (Protezioni)

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| EL-01 | Elimina azienda con studenti | Azienda con 5 studenti | Errore: "Trasferire prima gli studenti" | Alta |
| EL-02 | Elimina corso con edizioni | Corso con 2 edizioni | Errore: "Eliminare prima le edizioni" | Alta |
| EL-03 | Elimina edizione con iscrizioni | Edizione con 10 iscritti | Errore: "Eliminare prima le iscrizioni" | Alta |
| EL-04 | Elimina docente con sessioni | Docente con sessioni assegnate | Errore: "Riassegnare le sessioni" | Alta |
| EL-05 | Elimina studente con iscrizioni | Studente con iscrizioni attive | Conferma: "Studente ha iscrizioni. Confermare?" | Alta |

---

## 8. Test Validazioni Input

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| VI-01 | Email formato errato | "mario@" | Errore: "Formato email non valido" | Alta |
| VI-02 | Telefono formato errato | "123" | Errore: "Formato telefono non valido" | Media |
| VI-03 | P.IVA formato errato | "123456" | Errore: "P.IVA deve essere di 11 cifre" | Alta |
| VI-04 | CAP formato errato | "1234" | Errore: "CAP deve essere di 5 cifre" | Media |
| VI-05 | Provincia formato errato | "MIL" | Errore: "Provincia deve essere di 2 lettere" | Media |
| VI-06 | Data range invertito | Inizio > Fine | Errore: "Data inizio dopo data fine" | Alta |

---

## 9. Test Performance

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|------------------|----------|
| PF-01 | Caricamento dashboard | Apertura pagina | Tempo < 2 secondi | Alta |
| PF-02 | Lista 100 studenti | Pagina studenti | Tempo < 3 secondi | Alta |
| PF-03 | Import 500 righe | CSV con 500 studenti | Tempo < 30 secondi | Media |
| PF-04 | Export Excel grande | 1000 righe | Tempo < 10 secondi | Media |
| PF-05 | Ricerca debounced | Digitazione veloce | Nessun lag, richieste ridotte | Media |

---

## 10. Test UX e Responsività

| ID | Scenario | Dispositivo | Risultato Atteso | Priorità |
|----|----------|-------------|------------------|----------|
| UX-01 | Menu mobile | Smartphone | Menu hamburger funzionante | Alta |
| UX-02 | Tabelle responsive | Tablet | Scroll orizzontale fluido | Media |
| UX-03 | Form mobile | Smartphone | Input full-width, touch-friendly | Alta |
| UX-04 | Modal mobile | Smartphone | Modal fullscreen | Media |
| UX-05 | Toast notifications | Tutti | Visibili e non bloccanti | Alta |
| UX-06 | Loading states | Tutti | Spinner durante caricamento | Alta |

---

## Procedura di Esecuzione

### Pre-requisiti

1. Ambiente di test con dati di esempio
2. Browser: Chrome, Firefox, Safari, Edge
3. Dispositivi: Desktop, Tablet, Smartphone

### Esecuzione

1. Eseguire i test in ordine di priorità (Alta → Media → Bassa)
2. Documentare ogni fallimento con screenshot
3. Verificare i log del browser per errori JavaScript
4. Verificare i log del server per errori API

### Criteri di Accettazione

- **Priorità Alta**: 100% test superati
- **Priorità Media**: ≥ 90% test superati
- **Priorità Bassa**: ≥ 80% test superati

---

## Changelog

| Data | Versione | Modifiche |
|------|----------|-----------|
| 2026-01-23 | 1.0 | Creazione iniziale del piano di test |
