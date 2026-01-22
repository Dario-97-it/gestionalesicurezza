import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { studentsApi } from '../lib/api';

export default function Students() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    fiscalCode: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await studentsApi.create(formData);
      setMessage({ type: 'success', text: 'Studente aggiunto con successo!' });
      setFormData({ firstName: '', lastName: '', email: '', phone: '', fiscalCode: '' });
      setShowModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nell\'aggiunta dello studente' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Studenti</h1>
          <Button onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700">
            + Nuovo Studente
          </Button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Aggiungi Studente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">Clicca il pulsante in alto per aggiungere un nuovo studente</p>
              <Button onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700">
                + Nuovo Studente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuovo Studente">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nome" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
            <Input label="Cognome" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
            <Input label="Telefono" name="phone" value={formData.phone} onChange={handleInputChange} />
            <Input label="Codice Fiscale" name="fiscalCode" value={formData.fiscalCode} onChange={handleInputChange} />
            <div className="flex gap-3 justify-end pt-4">
              <Button onClick={() => setShowModal(false)} className="bg-gray-300 hover:bg-gray-400">Annulla</Button>
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
