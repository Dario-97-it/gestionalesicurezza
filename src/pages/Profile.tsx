import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, client } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La password deve essere di almeno 8 caratteri' });
      return;
    }

    setIsSaving(true);
    try {
      // API call to change password would go here
      // await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage({ type: 'success', text: 'Password aggiornata con successo' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore durante il cambio password' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Utente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Ruolo</p>
                  <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stato</p>
                  <p className="font-medium text-green-600">Attivo</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Azienda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nome Azienda</p>
                <p className="font-medium text-gray-900">{client?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Piano</p>
                <p className="font-medium text-gray-900 uppercase">{client?.plan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stato Abbonamento</p>
                <p className={`font-medium ${
                  client?.subscriptionStatus === 'active' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {client?.subscriptionStatus === 'active' ? 'Attivo' : 'In prova'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Utenti Massimi</p>
                <p className="font-medium text-gray-900">{client?.maxUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Sicurezza</CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            {!isChangingPassword ? (
              <Button onClick={() => setIsChangingPassword(true)}>
                Cambia Password
              </Button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="Password Attuale"
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
                <Input
                  label="Nuova Password"
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  helperText="Minimo 8 caratteri"
                />
                <Input
                  label="Conferma Nuova Password"
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
                <div className="flex gap-3">
                  <Button type="submit" isLoading={isSaving}>
                    Salva Password
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setMessage(null);
                    }}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
