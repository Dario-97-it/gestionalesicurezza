import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { editionsApi, coursesApi, instructorsApi } from '../lib/api';
import type { CourseEdition, Course, Instructor, PaginatedResponse } from '../types';

export default function Editions() {
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<CourseEdition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    startDate: '',
    endDate: '',
    location: '',
    maxParticipants: '',
    status: 'scheduled',
    notes: '',
  });

  const statusOptions = [
    { value: 'scheduled', label: 'Programmata', color: 'bg-blue-100 text-blue-700' },
    { value: 'in_progress', label: 'In Corso', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'completed', label: 'Completata', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Annullata', color: 'bg-red-100 text-red-700' },
  ];

  // Fetch editions
  const fetchEditions = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await editionsApi.getAll(page, pagination.pageSize, statusFilter || undefined, courseFilter);
      setEditions(response.data || []);
      setPagination({
        page: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err: any) {
      console.error('Error fetching editions:', err);
      setError('Errore nel caricamento delle edizioni');
      setEditions([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, statusFilter, courseFilter]);

  // Fetch courses and instructors for dropdowns
  const fetchDropdownData = useCallback(async () => {
    try {
      const [coursesRes, instructorsRes] = await Promise.all([
        coursesApi.getAll(1, 100),
        instructorsApi.getAll(1, 100)
      ]);
      setCourses(coursesRes.data || []);
      setInstructors(instructorsRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchEditions();
    fetchDropdownData();
  }, [statusFilter, courseFilter]);

  const handlePageChange = (page: number) => {
    fetchEditions(page);
  };

  const openCreateModal = () => {
    setSelectedEdition(null);
    setFormData({
      courseId: '',
      instructorId: '',
      startDate: '',
      endDate: '',
      location: '',
      maxParticipants: '20',
      status: 'scheduled',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (edition: CourseEdition) => {
    setSelectedEdition(edition);
    setFormData({
      courseId: edition.courseId ? String(edition.courseId) : '',
      instructorId: edition.instructorId ? String(edition.instructorId) : '',
      startDate: edition.startDate ? edition.startDate.split('T')[0] : '',
      endDate: edition.endDate ? edition.endDate.split('T')[0] : '',
      location: edition.location || '',
      maxParticipants: edition.maxParticipants ? String(edition.maxParticipants) : '',
      status: edition.status || 'scheduled',
      notes: edition.notes || '',
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
        courseId: formData.courseId ? Number(formData.courseId) : undefined,
        instructorId: formData.instructorId ? Number(formData.instructorId) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        location: formData.location || undefined,
        maxParticipants: formData.maxParticipants ? Number(formData.maxParticipants) : undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      if (selectedEdition) {
        await editionsApi.update(selectedEdition.id, data);
        setMessage({ type: 'success', text: 'Edizione aggiornata con successo' });
      } else {
        await editionsApi.create(data);
        setMessage({ type: 'success', text: 'Edizione creata con successo' });
      }
      setIsModalOpen(false);
      fetchEditions(pagination.page);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving edition:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEdition) return;
    setIsSaving(true);
    try {
      await editionsApi.delete(selectedEdition.id);
      setMessage({ type: 'success', text: 'Edizione eliminata con successo' });
      setIsDeleteDialogOpen(false);
      fetchEditions(pagination.page);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting edition:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nell\'eliminazione' });
    } finally {
      setIsSaving(false);
    }
  };

  const getCourseName = (courseId?: number) => {
    if (!courseId) return '-';
    const course = courses.find(c => c.id === courseId);
    return course?.title || '-';
  };

  const getInstructorName = (instructorId?: number) => {
    if (!instructorId) return '-';
    const instructor = instructors.find(i => i.id === instructorId);
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : '-';
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Edizioni Corsi</h1>
            <p className="text-gray-600 mt-1">Gestione delle edizioni dei corsi di formazione</p>
          </div>
          <Button onClick={openCreateModal}>
            + Nuova Edizione
          </Button>
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
            <button onClick={() => fetchEditions()} className="ml-4 underline">Riprova</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={courseFilter || ''}
            onChange={(e) => setCourseFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti i corsi</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti gli stati</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
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
                description="Inizia creando una nuova edizione di un corso"
                action={
                  <Button onClick={openCreateModal}>
                    + Nuova Edizione
                  </Button>
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corso</TableHead>
                      <TableHead>Data Inizio</TableHead>
                      <TableHead>Data Fine</TableHead>
                      <TableHead>Luogo</TableHead>
                      <TableHead>Docente</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editions.map((edition) => (
                      <TableRow key={edition.id}>
                        <TableCell className="font-medium">{getCourseName(edition.courseId)}</TableCell>
                        <TableCell>{formatDate(edition.startDate)}</TableCell>
                        <TableCell>{formatDate(edition.endDate)}</TableCell>
                        <TableCell>{edition.location || '-'}</TableCell>
                        <TableCell>{getInstructorName(edition.instructorId)}</TableCell>
                        <TableCell>{getStatusBadge(edition.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(edition)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteDialog(edition)}
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
        title={selectedEdition ? 'Modifica Edizione' : 'Nuova Edizione'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corso *</label>
            <select
              name="courseId"
              required
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona un corso</option>
              {courses.filter(c => c.isActive).map(course => (
                <option key={course.id} value={course.id}>{course.title} ({course.code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data Inizio *"
              name="startDate"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="Data Fine"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          <Input
            label="Luogo"
            name="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Es: Aula 1 - Via Roma 10"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Docente</label>
              <select
                name="instructorId"
                value={formData.instructorId}
                onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleziona un docente</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.firstName} {instructor.lastName}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Max Partecipanti"
              name="maxParticipants"
              type="number"
              min="1"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
            />
          </div>
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
        message="Sei sicuro di voler eliminare questa edizione? Questa azione non può essere annullata e rimuoverà anche tutte le iscrizioni e presenze associate."
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
