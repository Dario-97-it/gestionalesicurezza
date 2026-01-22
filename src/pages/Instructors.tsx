import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { instructorsApi } from '../lib/api';
import { debounce, formatCurrency } from '../lib/utils';
import type { Instructor } from '../types';

export default function Instructors() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    hourlyRate: '',
    notes: '',
  });

  const fetchInstructors = useCallback(async (page = 1, searchTerm = '') => {
    setIsLoading(true);
    try {
      const response = await instructorsApi.getAll(page, pagination.pageSize, searchTerm);
      setInstructors(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error('Error fetching instructors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    fetchInstructors();
  }, []);

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      fetchInstructors(1, term);
    }, 300),
    [fetchInstructors]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
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
      hourlyRate: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setFormData({
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      email: instructor.email || '',
      phone: instructor.phone || '',
      specialization: instructor.specialization || '',
      hourlyRate: instructor.hourlyRate ? (instructor.hourlyRate / 100).toString() : '',
      notes: instructor.notes || '',
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
        hourlyRate: formData.hourlyRate ? Math.round(parseFloat(formData.hourlyRate) * 100) : undefined,
        notes: formData.notes || undefined,
      };
      if (selectedInstructor) {
        await instructorsApi.update(selectedInstructor.id, data);
      } else {
        await instructorsApi.create(data);
      }
      setIsModalOpen(false);
      fetchInstructors(pagination.page, search);
    } catch (error) {
      console.error('Error saving instructor:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInstructor) return;
    setIsSaving(true);
    try {
      await instructorsApi.delete(selectedInstructor.id);
      setIsDeleteDialogOpen(false);
      fetchInstructors(pagination.page, search);
    } catch (error) {
      console.error('Error deleting instructor:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca docenti..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Nuovo Docente
          </Button>
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
                    <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      Nuovo Docente
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
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Specializzazione</TableHead>
                      <TableHead>Tariffa Oraria</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map((instructor) => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-medium">
                          {instructor.firstName} {instructor.lastName}
                        </TableCell>
                        <TableCell>{instructor.email || '-'}</TableCell>
                        <TableCell>{instructor.phone || '-'}</TableCell>
                        <TableCell>{instructor.specialization || '-'}</TableCell>
                        <TableCell>
                          {instructor.hourlyRate ? formatCurrency(instructor.hourlyRate) + '/h' : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(instructor)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(instructor)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-5 w-5" />
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
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedInstructor ? 'Modifica Docente' : 'Nuovo Docente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Specializzazione"
              name="specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              placeholder="es. Antincendio, Primo Soccorso"
            />
            <Input
              label="Tariffa Oraria (€)"
              name="hourlyRate"
              type="number"
              min="0"
              step="0.01"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
            />
          </div>
          <Textarea
            label="Note"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
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
