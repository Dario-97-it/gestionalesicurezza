import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { agentsApi } from '../lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface Agent {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  studentsCount?: number;
  companiesCount?: number;
  createdAt: string;
}

interface AgentDetail extends Agent {
  students: {
    id: number;
    firstName: string;
    lastName: string;
    fiscalCode: string;
    email: string | null;
    phone: string | null;
    companyName: string | null;
  }[];
  companies: {
    id: number;
    name: string;
    vatNumber: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
  }[];
}

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Detail view state
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await agentsApi.getAll();
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

  const loadAgentDetail = async (agentId: number) => {
    try {
      setLoadingDetail(true);
      const response = await agentsApi.getById(agentId);
      if (response.success) {
        setSelectedAgent(response.data);
        setShowDetail(true);
      } else {
        toast.error(response.error || 'Errore nel caricamento dettaglio');
      }
    } catch (error: any) {
      toast.error(error.message || 'Errore nel caricamento dettaglio agente');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Il nome è obbligatorio');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAgent) {
        await agentsApi.update(editingAgent.id, formData);
        toast.success('Agente aggiornato con successo');
      } else {
        await agentsApi.create(formData);
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
      await agentsApi.delete(deletingAgent.id);
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

  // Calculate totals
  const totalStudents = agents.reduce((sum, a) => sum + (a.studentsCount || 0), 0);
  const totalCompanies = agents.reduce((sum, a) => sum + (a.companiesCount || 0), 0);

  // Detail View
  if (showDetail && selectedAgent) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDetail(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{selectedAgent.name}</h1>
              <p className="text-gray-500">Dettaglio Agente Commerciale</p>
            </div>
            <Button
              variant="outline"
              onClick={() => openEditModal(selectedAgent)}
              className="flex items-center gap-2"
            >
              <PencilIcon className="w-4 h-4" />
              Modifica
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Studenti Portati</p>
                    <p className="text-3xl font-bold text-blue-700">{selectedAgent.studentsCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500 rounded-lg">
                    <BuildingOfficeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Aziende Collegate</p>
                    <p className="text-3xl font-bold text-green-700">{selectedAgent.companiesCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500 font-medium mb-2">Contatti</p>
                <div className="space-y-1">
                  {selectedAgent.email && (
                    <p className="text-sm">
                      <span className="text-gray-500">Email:</span>{' '}
                      <a href={`mailto:${selectedAgent.email}`} className="text-blue-600 hover:underline">
                        {selectedAgent.email}
                      </a>
                    </p>
                  )}
                  {selectedAgent.phone && (
                    <p className="text-sm">
                      <span className="text-gray-500">Tel:</span>{' '}
                      <a href={`tel:${selectedAgent.phone}`} className="text-blue-600 hover:underline">
                        {selectedAgent.phone}
                      </a>
                    </p>
                  )}
                  {!selectedAgent.email && !selectedAgent.phone && (
                    <p className="text-sm text-gray-400">Nessun contatto inserito</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {selectedAgent.notes && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Note</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedAgent.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Students Table */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-blue-500" />
                Studenti Portati da questo Agente ({selectedAgent.students?.length || 0})
              </h3>
              {selectedAgent.students && selectedAgent.students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice Fiscale</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedAgent.students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {student.fiscalCode}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {student.companyName || <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student.email || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student.phone || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Nessuno studente collegato a questo agente</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Collega gli studenti dalla pagina Studenti selezionando questo agente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Companies Table */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BuildingOfficeIcon className="h-5 w-5 text-green-500" />
                Aziende Collegate a questo Agente ({selectedAgent.companies?.length || 0})
              </h3>
              {selectedAgent.companies && selectedAgent.companies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ragione Sociale</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P.IVA</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Città</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedAgent.companies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                            {company.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {company.vatNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {company.city || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {company.email || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {company.phone || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Nessuna azienda collegata a questo agente</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Collega le aziende dalla pagina Aziende selezionando questo agente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal Modifica (anche in detail view) */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Modifica Agente"
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
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </form>
        </Modal>
      </Layout>
    );
  }

  // List View
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenti Commerciali</h1>
            <p className="text-gray-600">Gestione agenti che portano discenti ai corsi</p>
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

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <p className="text-sm text-purple-600 font-medium">Totale Agenti</p>
              <p className="text-3xl font-bold text-purple-700">{agents.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-600 font-medium">Totale Studenti Portati</p>
              <p className="text-3xl font-bold text-blue-700">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm text-green-600 font-medium">Totale Aziende Collegate</p>
              <p className="text-3xl font-bold text-green-700">{totalCompanies}</p>
            </CardContent>
          </Card>
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
                <TableHead>Nome Agente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead className="text-center">Studenti</TableHead>
                <TableHead className="text-center">Aziende</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      title="Nessun agente trovato"
                      description={searchTerm ? "Prova a modificare i criteri di ricerca" : "Inizia creando un nuovo agente"}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => (
                  <TableRow key={agent.id} className="hover:bg-gray-50">
                    <TableCell className="font-semibold text-gray-900">{agent.name}</TableCell>
                    <TableCell className="text-gray-600">{agent.email || '-'}</TableCell>
                    <TableCell className="text-gray-600">{agent.phone || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <UserGroupIcon className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-blue-600">{agent.studentsCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <BuildingOfficeIcon className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-green-600">{agent.companiesCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/agents/${agent.id}`)}
                          className="text-gray-600 hover:bg-gray-100"
                          title="Visualizza dettaglio"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(agent)}
                          className="text-blue-600 hover:bg-blue-50"
                          title="Modifica"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(agent)}
                          className="text-red-600 hover:bg-red-50"
                          title="Elimina"
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
              <p className="text-xs text-gray-500 mt-1">
                Può essere una persona fisica (es. Mario Rossi) o un'agenzia (es. Studio Consulenza SRL)
              </p>
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
                placeholder="Note aggiuntive sull'agente (es. zona di competenza, accordi commerciali...)"
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
          message={`Sei sicuro di voler eliminare l'agente "${deletingAgent?.name}"?\n\nNota: Gli studenti e le aziende collegati non verranno eliminati, ma perderanno il riferimento a questo agente.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
        />
      </div>
    </Layout>
  );
}
