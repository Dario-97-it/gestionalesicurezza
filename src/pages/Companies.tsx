import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { companiesApi } from '../lib/api';

interface Company {
  name: string;
  vatNumber: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
}

export default function Companies() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Company>({
    name: '',
    vatNumber: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
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
      await companiesApi.create(formData);
      setMessage({ type: 'success', text: 'Azienda aggiunta con successo!' });
      setFormData({
        name: '',
        vatNumber: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
      });
      setShowModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nell\'aggiunta dell\'azienda' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Aziende</h1>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            + Nuova Azienda
          </Button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Aggiungi Azienda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">Clicca il pulsante in alto per aggiungere una nuova azienda</p>
              <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
                + Nuova Azienda
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal for adding company */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuova Azienda">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome Azienda"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Partita IVA"
              name="vatNumber"
              value={formData.vatNumber}
              onChange={handleInputChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <Input
              label="Telefono"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <Input
              label="Indirizzo"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
            />
            <Input
              label="Persona di Contatto"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleInputChange}
            />
            <div className="flex gap-3 justify-end pt-4">
              <Button onClick={() => setShowModal(false)} className="bg-gray-300 hover:bg-gray-400">
                Annulla
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
