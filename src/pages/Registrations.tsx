import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { registrationsApi, editionsApi, studentsApi, coursesApi } from '../lib/api';
import { BulkEnrollmentModal } from '../components/BulkEnrollmentModal';
import { useNavigate } from 'react-router-dom';
import type { Registration, CourseEdition, Student, Course, PaginatedResponse } from '../types';

export default function Registrations() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [editionFilter, setEditionFilter] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); // New state for bulk enrollment
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    courseEditionId: '',
    studentId: '',
    status: 'confirmed',
    price: '',
    notes: '',
  });

  const statusOptions = [
    { value: 'pending', label: 'In Attesa', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'confirmed', label: 'Confermata', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Annullata', color: 'bg-red-100 text-red-700' },
    { value: 'completed', label: 'Completata', color: 'bg-blue-100 text-blue-700' },
  ];

  // Fetch registrations
  const fetchRegistrations = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await registrationsApi.getAll(page, pagination.pageSize, editionFilter);
      setRegistrations(response.data || []);
      setPagination({
        page: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
      setError('Errore nel caricamento delle iscrizioni');
      setRegistrations([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, editionFilter]);

  // Fetch dropdown data
  const fetchDropdownData = useCallback(async () => {
    try {
      const [editionsRes, studentsRes, coursesRes] = await Promise.all([
        editionsApi.getAll(1, 100),
        studentsApi.getAll(1, 100),
        coursesApi.getAll(1, 100)
      ]);
      setEditions(editionsRes.data || []);
      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchRegistrations();
    fetchDropdownData();
  }, [editionFilter]);

  const handlePageChange = (page: number) => {
    fetchRegistrations(page);
  };

  const openCreateModal = () => {
    setSelectedRegistration(null);
    setFormData({
      courseEditionId: '',
      studentId: '',
      status: 'confirmed',
      price: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (registration: Registration) => {
    setSelectedRegistration(registration);
    setFormData({
      courseEditionId: registration.courseEditionId ? String(registration.courseEditionId) : '',
      studentId: registration.studentId ? String(registration.studentId) : '',
      status: registration.status || 'confirmed',
      price: registration.price ? String(registration.price / 100) : '',
      notes: registration.notes || '',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        courseEditionId: formData.courseEditionId ? Number(formData.courseEditionId) : undefined,
        studentId: formData.studentId ? Number(formData.studentId) : undefined,
        status: formData.status,
        price: formData.price ? Number(formData.price) * 100 : undefined,
        notes: formData.notes || undefined,
      };

      if (selectedRegistration) {
        await registrationsApi.update(selectedRegistration.id, data);
        setMessage({ type: 'success', text: 'Iscrizione aggiornata con successo' });
      } else {
        await registrationsApi.create(data);
        setMessage({ type: 'success', text: 'Iscrizione creata con successo' });
      }
      setIsModalOpen(false);
      fetchRegistrations(pagination.page);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving registration:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRegistration) return;
    setIsSaving(true);
    try {
      await registrationsApi.delete(selectedRegistration.id);
      setMessage({ type: 'success', text: 'Iscrizione eliminata con successo' });
      setIsDeleteDialogOpen(false);
      fetchRegistrations(pagination.page);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting registration:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nell\'eliminazione' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStudentName = (studentId?: number) => {
    if (!studentId) return '-';
    const student = students.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : '-';
  };

  const getEditionInfo = (editionId?: number) => {
    if (!editionId) return '-';
    const edition = editions.find(e => e.id === editionId);
    if (!edition) return '-';
    const course = courses.find(c => c.id === edition.courseId);
    const startDate = edition.startDate ? new Date(edition.startDate).toLocaleDateString('it-IT') : '';
    return `${course?.title || 'Corso'} - ${startDate}`;
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-700'}`}>
        {option?.label || status}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Iscrizioni</h1>
            <p className="text-gray-600 mt-1">Gestione delle iscrizioni ai corsi</p>
          </div>
	          <div className="flex gap-2">
	            <Button onClick={openCreateModal}>
	              + Iscrizione Singola
	            </Button>
	            <Button onClick={() => setIsBulkModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
	              👥 Iscrizione Massiva
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
            <button onClick={() => fetchRegistrations()} className="ml-4 underline">Riprova</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={editionFilter || ''}
            onChange={(e) => setEditionFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutte le edizioni</option>
            {editions.map(edition => {
              const course = courses.find(c => c.id === edition.courseId);
              const startDate = edition.startDate ? new Date(edition.startDate).toLocaleDateString('it-IT') : '';
              return (
                <option key={edition.id} value={edition.id}>
                  {course?.title || 'Corso'} - {startDate}
                </option>
              );
            })}
          </select>
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
                description="Inizia creando una nuova iscrizione"
                action={
                  <Button onClick={openCreateModal}>
                    + Nuova Iscrizione
                  </Button>
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Studente</TableHead>
                      <TableHead>Corso/Edizione</TableHead>
                      <TableHead>Data Iscrizione</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">{getStudentName(registration.studentId)}</TableCell>
                        <TableCell>{getEditionInfo(registration.courseEditionId)}</TableCell>
                        <TableCell>{formatDate(registration.registrationDate)}</TableCell>
                        <TableCell>€{((registration.price || 0) / 100).toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(registration.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(registration)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteDialog(registration)}
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
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRegistration ? 'Modifica Iscrizione' : 'Nuova Iscrizione'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Edizione Corso *</label>
            <select
              name="courseEditionId"
              required
              value={formData.courseEditionId}
              onChange={(e) => setFormData({ ...formData, courseEditionId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona un'edizione</option>
              {editions.filter(e => e.status === 'scheduled' || e.status === 'in_progress').map(edition => {
                const course = courses.find(c => c.id === edition.courseId);
                const startDate = edition.startDate ? new Date(edition.startDate).toLocaleDateString('it-IT') : '';
                return (
                  <option key={edition.id} value={edition.id}>
                    {course?.title || 'Corso'} - {startDate}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Studente *</label>
            <select
              name="studentId"
              required
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona uno studente</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName} {student.fiscalCode ? `(${student.fiscalCode})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prezzo (€)"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Es: 150.00"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
              <select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Note aggiuntive..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {selectedRegistration ? 'Salva Modifiche' : 'Crea Iscrizione'}
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
	        message="Sei sicuro di voler eliminare questa iscrizione? Questa azione non può essere annullata."
	        confirmText="Elimina"
	        isLoading={isSaving}
	      />

        {/* Bulk Enrollment Modal */}
        <BulkEnrollmentModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => {
            setIsBulkModalOpen(false);
            fetchRegistrations(pagination.page);
            setMessage({ type: 'success', text: 'Iscrizione massiva completata con successo!' });
            setTimeout(() => setMessage(null), 3000);
          }}
        />
	    </Layout>
	  );
	}
