# SecurityTools - Migliori Pratiche di Sviluppo

## Validazioni

### Utilizzo delle validazioni
Importa le funzioni di validazione da `src/lib/validations.ts`:

```typescript
import { isValidEmail, isValidPhone, validationMessages } from '../lib/validations';

// Validare un'email
if (!isValidEmail(email)) {
  setError(validationMessages.email);
}
```

### Validazioni disponibili
- `isValidEmail()` - Valida formato email
- `isValidPhone()` - Valida numero telefono italiano
- `isValidVatNumber()` - Valida P.IVA italiana
- `isValidTaxCode()` - Valida Codice Fiscale
- `isValidDate()` - Valida data YYYY-MM-DD
- `isValidTime()` - Valida orario HH:MM
- `isValidTimeRange()` - Valida che end > start
- `isValidDateRange()` - Valida che end > start
- `isValidPassword()` - Valida password forte
- `isValidUrl()` - Valida URL
- `isPositiveNumber()` - Valida numero positivo
- `isValidPercentage()` - Valida numero 0-100

## Componenti UI

### Alert
Per messaggi di successo/errore/avvertimento:

```typescript
import { Alert } from '../components/ui/Alert';

<Alert 
  type="success"
  title="Operazione completata"
  message="L'elemento è stato salvato con successo"
  onClose={() => setShowAlert(false)}
  dismissible={true}
/>
```

### Loading
Per stati di caricamento:

```typescript
import { Loading, LoadingSpinner, SkeletonLoader } from '../components/ui/Loading';

// Schermo di caricamento completo
<Loading fullScreen message="Caricamento in corso..." />

// Spinner inline
<LoadingSpinner size="md" />

// Skeleton loader per liste
<SkeletonLoader count={5} height="h-12" />
```

### Tooltip
Per aiuti contestuali:

```typescript
import { Tooltip, HelpIcon } from '../components/ui/Tooltip';

<Tooltip content="Questo è un aiuto">
  <button>Hover per aiuto</button>
</Tooltip>

// Icona con aiuto
<HelpIcon content="Spiegazione del campo" />
```

### FormField
Per campi form con validazione:

```typescript
import { FormField, Form, FormGroup } from '../components/ui/FormField';

<Form onSubmit={handleSubmit}>
  <FormGroup columns={2}>
    <FormField 
      label="Email" 
      required 
      error={errors.email}
      help="Inserisci un'email valida"
    >
      <Input value={email} onChange={(e) => setEmail(e.target.value)} />
    </FormField>
    
    <FormField 
      label="Telefono" 
      error={errors.phone}
    >
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
    </FormField>
  </FormGroup>
</Form>
```

### Breadcrumb
Per navigazione:

```typescript
import { Breadcrumb } from '../components/ui/Breadcrumb';

<Breadcrumb items={[
  { label: 'Home', href: '/' },
  { label: 'Studenti', href: '/students' },
  { label: 'Marco Rossi', active: true }
]} />
```

## Gestione Errori

### Errori API
```typescript
try {
  const response = await fetch('/api/endpoint', { method: 'POST' });
  if (!response.ok) {
    const error = await response.json();
    toast.error(error.error || 'Errore sconosciuto');
    return;
  }
  toast.success('Operazione completata');
} catch (err) {
  console.error('Error:', err);
  toast.error('Errore di connessione');
}
```

### Validazione Form
```typescript
const errors: Record<string, string> = {};

if (!email) {
  errors.email = validationMessages.required;
} else if (!isValidEmail(email)) {
  errors.email = validationMessages.email;
}

if (!phone) {
  errors.phone = validationMessages.required;
} else if (!isValidPhone(phone)) {
  errors.phone = validationMessages.phone;
}

if (Object.keys(errors).length > 0) {
  setErrors(errors);
  return;
}
```

## Performance

### Ottimizzazione Query
- Usa paginazione per liste grandi
- Carica solo i dati necessari
- Usa indici nel database

### Code Splitting
- Importa componenti pesanti dinamicamente
- Usa React.lazy() per route

### Caching
- Memorizza i risultati delle API
- Usa useCallback per funzioni stabili
- Implementa cache locale quando appropriato

## Sicurezza

### Credenziali
- Non salvare credenziali in localStorage
- Criptare le credenziali nel database
- Usare HTTPS in produzione

### Validazione Input
- Valida sempre lato client E server
- Sanitizza le stringhe di input
- Usa prepared statements per query

### CORS
- Configura CORS correttamente
- Usa token JWT per autenticazione
- Implementa rate limiting

## Deployment

### Pre-deployment Checklist
- Tutti i test passano
- Nessun console.error in produzione
- Environment variables configurate
- Database migrato
- Build ottimizzato
- Performance accettabile
- Nessun dato sensibile esposto

### Monitoring
- Configura error tracking
- Monitora performance
- Configura logging
- Imposta alerting per errori critici
