import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface Agent {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/agents');
      if (response.success) {
        setAgents(response.data || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento agenti:', error);
      toast.error('Errore nel caricamento degli agenti');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Il nome è obbligatorio');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAgent) {
        await api.put(`/api/agents/${editingAgent.id}`, formData);
        toast.success('Agente aggiornato con successo');
      } else {
        await api.post('/api/agents', formData);
        toast.success('Agente creato con successo');
      }
      setShowModal(false);
      resetForm();
      fetchAgents();
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;
    try {
      await api.delete(`/api/agents/${deletingAgent.id}`);
      toast.success('Agente eliminato');
      setShowDeleteDialog(false);
      setDeletingAgent(null);
      fetchAgents();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email || '',
      phone: agent.phone || '',
      notes: agent.notes || ''
    });
    setShowModal(true);
  };

  const openDeleteDialog = (agent: Agent) => {
    setDeletingAgent(agent);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setEditingAgent(null);
    setFormData({ name: '', email: '', phone: '', notes: '' });
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.email && agent.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenti</h1>
            <p className="text-gray-600">Gestione agenti commerciali</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-4 h-4" />
              Esporta
            </Button>
            <Button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Nuovo Agente
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Cerca per nome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      title="Nessun agente trovato"
                      description={searchTerm ? "Prova a modificare i criteri di ricerca" : "Inizia creando un nuovo agente"}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">#{agent.id}</TableCell>
                    <TableCell className="font-semibold">{agent.name}</TableCell>
                    <TableCell>{agent.email || '-'}</TableCell>
                    <TableCell>{agent.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(agent)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(agent)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Modal Crea/Modifica */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingAgent ? 'Modifica Agente' : 'Nuovo Agente'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome agente o ragione sociale"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@esempio.it"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+39 333 1234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Note aggiuntive..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Salvataggio...' : (editingAgent ? 'Salva Modifiche' : 'Crea Agente')}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Dialog Conferma Eliminazione */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Elimina Agente"
          message={`Sei sicuro di voler eliminare l'agente "${deletingAgent?.name}"? Questa azione è irreversibile.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
        />
      </div>
    </Layout>
  );
}
