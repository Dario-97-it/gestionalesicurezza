import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { editionsApi, coursesApi, instructorsApi, companiesApi } from '../lib/api';
import { formatDate, formatCurrency } from '../lib/utils';
import type { CourseEdition, Course, Instructor, Company } from '../types';

const EDITION_STATUSES = [
  { value: 'scheduled', label: 'Programmato' },
  { value: 'ongoing', label: 'In corso' },
  { value: 'completed', label: 'Completato' },
  { value: 'cancelled', label: 'Annullato' },
];

export default function Editions() {
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<CourseEdition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    courseId: '',
    startDate: '',
    endDate: '',
    location: '',
    instructorId: '',
    maxParticipants: '20',
    price: '',
    dedicatedCompanyId: '',
    status: 'scheduled',
  });

  const fetchEditions = useCallback(async (page = 1, status?: string) => {
    setIsLoading(true);
    try {
      const response = await editionsApi.getAll(page, pagination.pageSize, status);
      setEditions(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error('Error fetching editions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  const fetchRelatedData = async () => {
    try {
      const [coursesRes, instructorsRes, companiesRes] = await Promise.all([
        coursesApi.getAll(1, 1000),
        instructorsApi.getAll(1, 1000),
        companiesApi.getAll(1, 1000),
      ]);
      setCourses(coursesRes.data);
      setInstructors(instructorsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  useEffect(() => {
    fetchEditions();
    fetchRelatedData();
  }, []);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value);
    fetchEditions(1, value || undefined);
  };

  const handlePageChange = (page: number) => {
    fetchEditions(page, statusFilter || undefined);
  };

  const openCreateModal = () => {
    setSelectedEdition(null);
    setFormData({
      courseId: '',
      startDate: '',
      endDate: '',
      location: '',
      instructorId: '',
      maxParticipants: '20',
      price: '',
      dedicatedCompanyId: '',
      status: 'scheduled',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (edition: CourseEdition) => {
    setSelectedEdition(edition);
    setFormData({
      courseId: edition.courseId.toString(),
      startDate: edition.startDate.split('T')[0],
      endDate: edition.endDate.split('T')[0],
      location: edition.location,
      instructorId: edition.instructorId?.toString() || '',
      maxParticipants: edition.maxParticipants.toString(),
      price: (edition.price / 100).toString(),
      dedicatedCompanyId: edition.dedicatedCompanyId?.toString() || '',
      status: edition.status,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (edition: CourseEdition) => {
    setSelectedEdition(edition);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        courseId: parseInt(formData.courseId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        instructorId: formData.instructorId ? parseInt(formData.instructorId) : undefined,
        maxParticipants: parseInt(formData.maxParticipants),
        price: Math.round(parseFloat(formData.price) * 100),
        dedicatedCompanyId: formData.dedicatedCompanyId ? parseInt(formData.dedicatedCompanyId) : undefined,
        status: formData.status as CourseEdition['status'],
      };
      if (selectedEdition) {
        await editionsApi.update(selectedEdition.id, data);
      } else {
        await editionsApi.create(data);
      }
      setIsModalOpen(false);
      fetchEditions(pagination.page, statusFilter || undefined);
    } catch (error) {
      console.error('Error saving edition:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEdition) return;
    setIsSaving(true);
    try {
      await editionsApi.delete(selectedEdition.id);
      setIsDeleteDialogOpen(false);
      fetchEditions(pagination.page, statusFilter || undefined);
    } catch (error) {
      console.error('Error deleting edition:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti gli stati</option>
            {EDITION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Nuova Edizione
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : editions.length === 0 ? (
              <EmptyState
                title="Nessuna edizione trovata"
                description="Inizia aggiungendo la prima edizione"
                action={
                  <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
                    Nuova Edizione
                  </Button>
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corso</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Luogo</TableHead>
                      <TableHead>Docente</TableHead>
                      <TableHead>Iscritti</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editions.map((edition) => (
                      <TableRow key={edition.id}>
                        <TableCell className="font-medium">
                          {edition.course?.title || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {formatDate(edition.startDate)} - {formatDate(edition.endDate)}
                        </TableCell>
                        <TableCell>{edition.location}</TableCell>
                        <TableCell>
                          {edition.instructor
                            ? `${edition.instructor.firstName} ${edition.instructor.lastName}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {edition.registrationsCount || 0}/{edition.maxParticipants}
                        </TableCell>
                        <TableCell>{formatCurrency(edition.price)}</TableCell>
                        <TableCell>
                          <StatusBadge status={edition.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(edition)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(edition)}
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
        title={selectedEdition ? 'Modifica Edizione' : 'Nuova Edizione'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Corso *"
            name="courseId"
            required
            value={formData.courseId}
            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
            options={courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.title}` }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data Inizio *"
              name="startDate"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="Data Fine *"
              name="endDate"
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          <Input
            label="Luogo *"
            name="location"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Docente"
              name="instructorId"
              value={formData.instructorId}
              onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
              options={instructors.map((i) => ({ value: i.id, label: `${i.firstName} ${i.lastName}` }))}
            />
            <Select
              label="Azienda Dedicata"
              name="dedicatedCompanyId"
              value={formData.dedicatedCompanyId}
              onChange={(e) => setFormData({ ...formData, dedicatedCompanyId: e.target.value })}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Max Partecipanti *"
              name="maxParticipants"
              type="number"
              required
              min="1"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
            />
            <Input
              label="Prezzo (€) *"
              name="price"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Select
              label="Stato *"
              name="status"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={EDITION_STATUSES}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {selectedEdition ? 'Salva Modifiche' : 'Crea Edizione'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Edizione"
        message={`Sei sicuro di voler eliminare questa edizione? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
