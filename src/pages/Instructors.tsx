import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { instructorsApi } from '../lib/api';
import type { Instructor, PaginatedResponse } from '../types';

export default function Instructors() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    bio: '',
    isActive: '1',
  });

  // Fetch instructors
  const fetchInstructors = useCallback(async (page = 1, searchTerm = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await instructorsApi.getAll(page, pagination.pageSize, searchTerm);
      setInstructors(response.data || []);
      setPagination({
        page: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err: any) {
      console.error('Error fetching instructors:', err);
      setError('Errore nel caricamento dei docenti');
      setInstructors([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  // Load instructors on mount
  useEffect(() => {
    fetchInstructors();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstructors(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handlePageChange = (page: number) => {
    fetchInstructors(page, search);
  };

  const openCreateModal = () => {
    setSelectedInstructor(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialization: '',
      bio: '',
      isActive: '1',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setFormData({
      firstName: instructor.firstName || '',
      lastName: instructor.lastName || '',
      email: instructor.email || '',
      phone: instructor.phone || '',
      specialization: instructor.specialization || '',
      bio: instructor.bio || '',
      isActive: instructor.isActive ? '1' : '0',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        specialization: formData.specialization || undefined,
        bio: formData.bio || undefined,
        isActive: formData.isActive === '1' ? 1 : 0,
      };

      if (selectedInstructor) {
        await instructorsApi.update(selectedInstructor.id, data);
        setMessage({ type: 'success', text: 'Docente aggiornato con successo' });
      } else {
        await instructorsApi.create(data);
        setMessage({ type: 'success', text: 'Docente creato con successo' });
      }
      setIsModalOpen(false);
      fetchInstructors(pagination.page, search);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving instructor:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInstructor) return;
    setIsSaving(true);
    try {
      await instructorsApi.delete(selectedInstructor.id);
      setMessage({ type: 'success', text: 'Docente eliminato con successo' });
      setIsDeleteDialogOpen(false);
      fetchInstructors(pagination.page, search);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting instructor:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nell\'eliminazione' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!instructors || instructors.length === 0) {
      setMessage({ type: 'error', text: 'Nessun dato da esportare' });
      return;
    }

    const headers = ['Nome', 'Cognome', 'Email', 'Telefono', 'Specializzazione', 'Attivo'];
    const rows = instructors.map(i => [
      i.firstName || '',
      i.lastName || '',
      i.email || '',
      i.phone || '',
      i.specialization || '',
      i.isActive ? 'Sì' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `docenti_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setMessage({ type: 'success', text: 'Export completato' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Docenti</h1>
            <p className="text-gray-600 mt-1">Gestione dei docenti e formatori</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="secondary">
              📥 Esporta
            </Button>
            <Button onClick={openCreateModal}>
              + Nuovo Docente
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
            {error}
            <button onClick={() => fetchInstructors()} className="ml-4 underline">Riprova</button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Cerca per nome, cognome, specializzazione..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : instructors.length === 0 ? (
              <EmptyState
                title="Nessun docente trovato"
                description={search ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo il primo docente'}
                action={
                  !search && (
                    <Button onClick={openCreateModal}>
                      + Nuovo Docente
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cognome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Specializzazione</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map((instructor) => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-medium">{instructor.firstName}</TableCell>
                        <TableCell>{instructor.lastName}</TableCell>
                        <TableCell>{instructor.email || '-'}</TableCell>
                        <TableCell>{instructor.phone || '-'}</TableCell>
                        <TableCell>{instructor.specialization || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={instructor.isActive ? 'success' : 'secondary'}>
                            {instructor.isActive ? 'Attivo' : 'Inattivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(instructor)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteDialog(instructor)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Elimina"
                            >
                              🗑️
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {!isLoading && instructors.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            Mostrati {instructors.length} di {pagination.total} docenti
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedInstructor ? 'Modifica Docente' : 'Nuovo Docente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            {selectedInstructor ? 'Modifica i dati del docente.' : 'Inserisci i dati del nuovo docente.'} I campi contrassegnati con * sono obbligatori.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              name="firstName"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Cognome *"
              name="lastName"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Telefono"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <Input
            label="Specializzazione"
            name="specialization"
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            placeholder="Es: Sicurezza sul lavoro, Antincendio, Primo Soccorso"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Breve descrizione del docente..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
            <select
              name="isActive"
              value={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">Attivo</option>
              <option value="0">Inattivo</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {selectedInstructor ? 'Salva Modifiche' : 'Crea Docente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Docente"
        message={`Sei sicuro di voler eliminare il docente "${selectedInstructor?.firstName} ${selectedInstructor?.lastName}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
