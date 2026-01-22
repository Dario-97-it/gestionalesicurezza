import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { coursesApi } from '../lib/api';
import { debounce, formatCurrency } from '../lib/utils';
import type { Course } from '../types';

const COURSE_TYPES = [
  { value: 'sicurezza_generale', label: 'Sicurezza Generale' },
  { value: 'primo_soccorso', label: 'Primo Soccorso' },
  { value: 'antincendio', label: 'Antincendio' },
  { value: 'rls', label: 'RLS' },
  { value: 'rspp', label: 'RSPP' },
  { value: 'preposto', label: 'Preposto' },
  { value: 'dirigente', label: 'Dirigente' },
  { value: 'altro', label: 'Altro' },
];

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    type: '',
    durationHours: '',
    defaultPrice: '',
    description: '',
    certificateValidityMonths: '',
    isActive: true,
  });

  const fetchCourses = useCallback(async (page = 1, searchTerm = '') => {
    setIsLoading(true);
    try {
      const response = await coursesApi.getAll(page, pagination.pageSize, searchTerm);
      setCourses(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      fetchCourses(1, term);
    }, 300),
    [fetchCourses]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const handlePageChange = (page: number) => {
    fetchCourses(page, search);
  };

  const openCreateModal = () => {
    setSelectedCourse(null);
    setFormData({
      title: '',
      code: '',
      type: '',
      durationHours: '',
      defaultPrice: '',
      description: '',
      certificateValidityMonths: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      code: course.code,
      type: course.type,
      durationHours: course.durationHours.toString(),
      defaultPrice: (course.defaultPrice / 100).toString(),
      description: course.description || '',
      certificateValidityMonths: course.certificateValidityMonths?.toString() || '',
      isActive: course.isActive,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (course: Course) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        title: formData.title,
        code: formData.code,
        type: formData.type,
        durationHours: parseInt(formData.durationHours),
        defaultPrice: Math.round(parseFloat(formData.defaultPrice) * 100),
        description: formData.description || undefined,
        certificateValidityMonths: formData.certificateValidityMonths ? parseInt(formData.certificateValidityMonths) : undefined,
        isActive: formData.isActive,
      };
      if (selectedCourse) {
        await coursesApi.update(selectedCourse.id, data);
      } else {
        await coursesApi.create(data);
      }
      setIsModalOpen(false);
      fetchCourses(pagination.page, search);
    } catch (error) {
      console.error('Error saving course:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;
    setIsSaving(true);
    try {
      await coursesApi.delete(selectedCourse.id);
      setIsDeleteDialogOpen(false);
      fetchCourses(pagination.page, search);
    } catch (error) {
      console.error('Error deleting course:', error);
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
              placeholder="Cerca corsi..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Nuovo Corso
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : courses.length === 0 ? (
              <EmptyState
                title="Nessun corso trovato"
                description={search ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo il primo corso'}
                action={
                  !search && (
                    <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      Nuovo Corso
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codice</TableHead>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Durata</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.code}</TableCell>
                        <TableCell>{course.title}</TableCell>
                        <TableCell>
                          {COURSE_TYPES.find((t) => t.value === course.type)?.label || course.type}
                        </TableCell>
                        <TableCell>{course.durationHours}h</TableCell>
                        <TableCell>{formatCurrency(course.defaultPrice)}</TableCell>
                        <TableCell>
                          <StatusBadge status={course.isActive ? 'active' : 'suspended'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(course)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(course)}
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
        title={selectedCourse ? 'Modifica Corso' : 'Nuovo Corso'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Codice *"
              name="code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
            <Select
              label="Tipo *"
              name="type"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={COURSE_TYPES}
            />
          </div>
          <Input
            label="Titolo *"
            name="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Durata (ore) *"
              name="durationHours"
              type="number"
              required
              min="1"
              value={formData.durationHours}
              onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
            />
            <Input
              label="Prezzo (€) *"
              name="defaultPrice"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.defaultPrice}
              onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
            />
            <Input
              label="Validità (mesi)"
              name="certificateValidityMonths"
              type="number"
              min="1"
              value={formData.certificateValidityMonths}
              onChange={(e) => setFormData({ ...formData, certificateValidityMonths: e.target.value })}
            />
          </div>
          <Textarea
            label="Descrizione"
            name="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Corso attivo
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {selectedCourse ? 'Salva Modifiche' : 'Crea Corso'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Corso"
        message={`Sei sicuro di voler eliminare il corso "${selectedCourse?.title}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
