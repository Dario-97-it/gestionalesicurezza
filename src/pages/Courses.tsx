import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { coursesApi } from '../lib/api';

export default function Courses() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    duration: '',
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
      await coursesApi.create(formData);
      setMessage({ type: 'success', text: 'Corso aggiunto con successo!' });
      setFormData({ code: '', title: '', description: '', duration: '' });
      setShowModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nell\'aggiunta del corso' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Corsi</h1>
          <Button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700">
            + Nuovo Corso
          </Button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Aggiungi Corso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">Clicca il pulsante in alto per aggiungere un nuovo corso</p>
              <Button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700">
                + Nuovo Corso
              </Button>
            </div>
          </CardContent>
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuovo Corso">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Codice" name="code" value={formData.code} onChange={handleInputChange} required />
            <Input label="Titolo" name="title" value={formData.title} onChange={handleInputChange} required />
            <Input label="Descrizione" name="description" value={formData.description} onChange={handleInputChange} />
            <Input label="Durata (ore)" name="duration" type="number" value={formData.duration} onChange={handleInputChange} />
            <div className="flex gap-3 justify-end pt-4">
              <Button onClick={() => setShowModal(false)} className="bg-gray-300 hover:bg-gray-400">Annulla</Button>
              <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                {isLoading ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
