import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { registrationsApi, editionsApi, studentsApi, companiesApi } from '../lib/api';
import { formatDate, formatCurrency } from '../lib/utils';
import type { Registration, CourseEdition, Student, Company } from '../types';

const REGISTRATION_STATUSES = [
  { value: 'confirmed', label: 'Confermato' },
  { value: 'pending', label: 'In attesa' },
  { value: 'cancelled', label: 'Annullato' },
];

export default function Registrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [editionFilter, setEditionFilter] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    courseEditionId: '',
    companyId: '',
    priceApplied: '',
    status: 'confirmed',
    notes: '',
  });

  const fetchRegistrations = useCallback(async (page = 1, editionId?: number) => {
    setIsLoading(true);
    try {
      const response = await registrationsApi.getAll(page, pagination.pageSize, editionId);
      setRegistrations(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  const fetchRelatedData = async () => {
    try {
      const [editionsRes, studentsRes, companiesRes] = await Promise.all([
        editionsApi.getAll(1, 1000),
        studentsApi.getAll(1, 1000),
        companiesApi.getAll(1, 1000),
      ]);
      setEditions(editionsRes.data);
      setStudents(studentsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    fetchRelatedData();
  }, []);

  const handleEditionFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : undefined;
    setEditionFilter(value);
    fetchRegistrations(1, value);
  };

  const handlePageChange = (page: number) => {
    fetchRegistrations(page, editionFilter);
  };

  const openCreateModal = () => {
    setSelectedRegistration(null);
    setFormData({
      studentId: '',
      courseEditionId: '',
      companyId: '',
      priceApplied: '',
      status: 'confirmed',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsDeleteDialogOpen(true);
  };

  const handleEditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const editionId = e.target.value;
    setFormData({ ...formData, courseEditionId: editionId });
    
    // Auto-fill price from edition
    if (editionId) {
      const edition = editions.find((ed) => ed.id === parseInt(editionId));
      if (edition) {
        setFormData((prev) => ({
          ...prev,
          courseEditionId: editionId,
          priceApplied: (edition.price / 100).toString(),
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        studentId: parseInt(formData.studentId),
        courseEditionId: parseInt(formData.courseEditionId),
        companyId: formData.companyId ? parseInt(formData.companyId) : undefined,
        priceApplied: Math.round(parseFloat(formData.priceApplied) * 100),
        status: formData.status as Registration['status'],
        notes: formData.notes || undefined,
      };
      await registrationsApi.create(data);
      setIsModalOpen(false);
      fetchRegistrations(pagination.page, editionFilter);
    } catch (error) {
      console.error('Error saving registration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRegistration) return;
    setIsSaving(true);
    try {
      await registrationsApi.delete(selectedRegistration.id);
      setIsDeleteDialogOpen(false);
      fetchRegistrations(pagination.page, editionFilter);
    } catch (error) {
      console.error('Error deleting registration:', error);
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
            value={editionFilter || ''}
            onChange={handleEditionFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-md"
          >
            <option value="">Tutte le edizioni</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.course?.title} - {formatDate(edition.startDate)}
              </option>
            ))}
          </select>
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Nuova Iscrizione
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : registrations.length === 0 ? (
              <EmptyState
                title="Nessuna iscrizione trovata"
                description="Inizia aggiungendo la prima iscrizione"
                action={
                  <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
                    Nuova Iscrizione
                  </Button>
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Studente</TableHead>
                      <TableHead>Corso</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Data Iscrizione</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">
                          {registration.student?.firstName} {registration.student?.lastName}
                        </TableCell>
                        <TableCell>
                          {registration.courseEdition?.course?.title || 'N/A'}
                        </TableCell>
                        <TableCell>{registration.company?.name || '-'}</TableCell>
                        <TableCell>{formatDate(registration.registrationDate)}</TableCell>
                        <TableCell>{formatCurrency(registration.priceApplied)}</TableCell>
                        <TableCell>
                          <StatusBadge status={registration.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => openDeleteDialog(registration)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
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

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuova Iscrizione"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Edizione Corso *"
            name="courseEditionId"
            required
            value={formData.courseEditionId}
            onChange={handleEditionChange}
            options={editions.map((e) => ({
              value: e.id,
              label: `${e.course?.title || 'Corso'} - ${formatDate(e.startDate)} (${e.registrationsCount || 0}/${e.maxParticipants})`,
            }))}
          />
          <Select
            label="Studente *"
            name="studentId"
            required
            value={formData.studentId}
            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
            options={students.map((s) => ({
              value: s.id,
              label: `${s.firstName} ${s.lastName}${s.company ? ` (${s.company.name})` : ''}`,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Azienda Pagante"
              name="companyId"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Input
              label="Prezzo Applicato (€) *"
              name="priceApplied"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.priceApplied}
              onChange={(e) => setFormData({ ...formData, priceApplied: e.target.value })}
            />
          </div>
          <Select
            label="Stato *"
            name="status"
            required
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={REGISTRATION_STATUSES}
          />
          <Textarea
            label="Note"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Crea Iscrizione
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Iscrizione"
        message={`Sei sicuro di voler eliminare questa iscrizione? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
