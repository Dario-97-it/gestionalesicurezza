import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast } from '../components/ui/Toast';

export const EmailSettings = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Inserisci email e password' });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactorCode })
      });

      const data = await response.json();

      if (response.status === 403) {
        // Richiesta 2FA
        setShowTwoFactor(true);
        setMessage({ type: 'error', text: 'Autenticazione a 2 fattori richiesta. Inserisci il codice.' });
      } else if (response.ok) {
        setMessage({ type: 'success', text: 'Connessione riuscita!' });
        setSavedEmail(email);
        setShowTwoFactor(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore di connessione' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nella connessione' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Inserisci email e password' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactorCode })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Impostazioni salvate con successo!' });
        setSavedEmail(email);
        setPassword('');
        setTwoFactorCode('');
        setShowTwoFactor(false);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Impostazioni Email per Inviti Calendario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Le credenziali Gmail vengono utilizzate per inviare gli inviti calendario ai docenti. 
                Verranno criptate e archiviate in modo sicuro.
              </p>
            </div>

            {message && (
              <Toast
                type={message.type}
                message={message.text}
                onClose={() => setMessage(null)}
              />
            )}

            {savedEmail && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Email configurata:</strong> {savedEmail}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Gmail
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tua.email@gmail.com"
                  disabled={isLoading || isTesting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Gmail
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La tua password Gmail"
                  disabled={isLoading || isTesting}
                />
              </div>

              {showTwoFactor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Codice Autenticazione a 2 Fattori
                  </label>
                  <Input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Inserisci il codice SMS o da Authenticator"
                    disabled={isLoading || isTesting}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Se hai abilitato la verifica a 2 fattori, inserisci il codice ricevuto via SMS o dall'app Authenticator.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleTestConnection}
                  variant="secondary"
                  disabled={isLoading || isTesting || !email || !password}
                >
                  {isTesting ? 'Test in corso...' : '🔗 Test Connessione'}
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isLoading || isTesting || !email || !password}
                >
                  {isLoading ? 'Salvataggio...' : '💾 Salva Impostazioni'}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Come configurare:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Accedi al tuo account Google</li>
                <li>Se hai la verifica a 2 fattori attiva, avrai bisogno del codice</li>
                <li>Inserisci le credenziali qui sopra</li>
                <li>Clicca "Test Connessione" per verificare</li>
                <li>Salva le impostazioni</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};
