import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { coursesApi } from '../lib/api';
import type { Course, PaginatedResponse } from '../types';

export default function Services() {
  const [services, setServices] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDetails, setCourseDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    type: 'base',
    durationHours: '',
    defaultPrice: '',
    description: '',
    isActive: '1',
    certificateValidityMonths: '',
  });

  // Course types for D.Lgs. 81/08
  const courseTypes = [
    { value: 'base', label: 'Formazione Base' },
    { value: 'specifica', label: 'Formazione Specifica' },
    { value: 'preposti', label: 'Formazione Preposti' },
    { value: 'dirigenti', label: 'Formazione Dirigenti' },
    { value: 'rspp', label: 'RSPP/ASPP' },
    { value: 'rls', label: 'RLS' },
    { value: 'antincendio', label: 'Antincendio' },
    { value: 'primo_soccorso', label: 'Primo Soccorso' },
    { value: 'attrezzature', label: 'Attrezzature di Lavoro' },
    { value: 'aggiornamento', label: 'Aggiornamento' },
    { value: 'altro', label: 'Altro' },
  ];

  // Fetch courses
  const fetchServices = useCallback(async (page = 1, searchTerm = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await coursesApi.getAll(page, pagination.pageSize, searchTerm);
      let filteredCourses = response.data || [];
      
      // Apply active filter client-side
      if (activeFilter === 'active') {
        filteredCourses = filteredCourses.filter(c => c.isActive);
      } else if (activeFilter === 'inactive') {
        filteredCourses = filteredCourses.filter(c => !c.isActive);
      }
      
      // Apply search filter client-side
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredCourses = filteredCourses.filter(c => 
          c.title?.toLowerCase().includes(searchLower) ||
          c.code?.toLowerCase().includes(searchLower) ||
          c.type?.toLowerCase().includes(searchLower)
        );
      }
      
      setServices(filteredCourses);
      setPagination({
        page: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError('Errore nel caricamento dei corsi');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, activeFilter]);

  // Load courses on mount
  useEffect(() => {
    fetchServices();
  }, [activeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handlePageChange = (page: number) => {
    fetchServices(page, search);
  };

  const openCreateModal = () => {
    setSelectedCourse(null);
    setFormData({
      title: '',
      code: '',
      type: 'base',
      durationHours: '',
      defaultPrice: '',
      description: '',
      isActive: '1',
      certificateValidityMonths: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title || '',
      code: course.code || '',
      type: course.type || 'base',
      durationHours: course.durationHours ? String(course.durationHours) : '',
      defaultPrice: course.defaultPrice ? String(course.defaultPrice / 100) : '',
      description: course.description || '',
      isActive: course.isActive ? '1' : '0',
      certificateValidityMonths: (course as any).certificateValidityMonths ? String((course as any).certificateValidityMonths) : '',
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
      // Validazioni client-side
      if (!formData.title.trim()) {
        setMessage({ type: 'error', text: 'Il titolo è obbligatorio' });
        setIsSaving(false);
        return;
      }
      if (!formData.code.trim()) {
        setMessage({ type: 'error', text: 'Il codice è obbligatorio' });
        setIsSaving(false);
        return;
      }
      if (!formData.durationHours || Number(formData.durationHours) <= 0) {
        setMessage({ type: 'error', text: 'La durata deve essere > 0' });
        setIsSaving(false);
        return;
      }
      if (!formData.defaultPrice || Number(formData.defaultPrice) < 0) {
        setMessage({ type: 'error', text: 'Il prezzo non può essere negativo' });
        setIsSaving(false);
        return;
      }
      if (formData.certificateValidityMonths && Number(formData.certificateValidityMonths) <= 0) {
        setMessage({ type: 'error', text: 'La validità certificato deve essere > 0' });
        setIsSaving(false);
        return;
      }
      
      const data = {
        title: formData.title,
        code: formData.code,
        type: formData.type,
        durationHours: formData.durationHours ? Number(formData.durationHours) : undefined,
        defaultPrice: formData.defaultPrice ? Number(formData.defaultPrice) * 100 : undefined, // Convert to cents
        description: formData.description || undefined,
        isActive: formData.isActive === '1' ? 1 : 0,
        certificateValidityMonths: formData.certificateValidityMonths ? Number(formData.certificateValidityMonths) : undefined,
      };

      if (selectedCourse) {
        await coursesApi.update(selectedCourse.id, data);
        setMessage({ type: 'success', text: 'Corso aggiornato con successo' });
      } else {
        await coursesApi.create(data);
        setMessage({ type: 'success', text: 'Corso creato con successo' });
      }
      setIsModalOpen(false);
      fetchServices(pagination.page, search);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving course:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDetailsModal = async (course: Course) => {
    setSelectedCourse(course);
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/courses/${course.id}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch details');
      const data = await response.json();
      setCourseDetails(data);
      setIsDetailsModalOpen(true);
    } catch (err: any) {
      console.error('Error fetching course details:', err);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dettagli' });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;
    setIsSaving(true);
    try {
      await coursesApi.delete(selectedCourse.id);
      setMessage({ type: 'success', text: 'Corso eliminato con successo' });
      setIsDeleteDialogOpen(false);
      fetchServices(pagination.page, search);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting course:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nell\'eliminazione' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!services || services.length === 0) {
      setMessage({ type: 'error', text: 'Nessun dato da esportare' });
      return;
    }

    const headers = ['Titolo', 'Codice', 'Tipo', 'Durata (ore)', 'Prezzo (€)', 'Descrizione', 'Attivo'];
    const rows = services.map(c => [
      c.title || '',
      c.code || '',
      c.type || '',
      c.durationHours || '',
      c.defaultPrice ? (c.defaultPrice / 100).toFixed(2) : '',
      c.description || '',
      c.isActive ? 'Sì' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `corsi_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setMessage({ type: 'success', text: 'Export completato' });
    setTimeout(() => setMessage(null), 3000);
  };

  const getTypeLabel = (type: string) => {
    const found = courseTypes.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Corsi</h1>
            <p className="text-gray-600 mt-1">Catalogo corsi di sicurezza sul lavoro (D.Lgs. 81/08)</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="secondary">
              📥 Esporta
            </Button>
            <Button onClick={openCreateModal}>
              + Nuovo Corso
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
            <button onClick={() => fetchServices()} className="ml-4 underline">Riprova</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Cerca per titolo, codice, tipo..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tutti i corsi</option>
            <option value="active">Solo attivi</option>
            <option value="inactive">Solo inattivi</option>
          </select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : services.length === 0 ? (
              <EmptyState
                title="Nessun corso trovato"
                description={search ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo il primo corso'}
                action={
                  !search && (
                    <Button onClick={openCreateModal}>
                      + Nuovo Corso
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Codice</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Durata</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell className="font-mono text-sm">{course.code}</TableCell>
                        <TableCell>{getTypeLabel(course.type)}</TableCell>
                        <TableCell>{course.durationHours}h</TableCell>
                        <TableCell>€{((course.defaultPrice || 0) / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={course.isActive ? 'success' : 'secondary'}>
                            {course.isActive ? 'Attivo' : 'Inattivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openDetailsModal(course)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Visualizza dettagli"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => openEditModal(course)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteDialog(course)}
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
        {!isLoading && services.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            Mostrati {services.length} di {pagination.total} corsi
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCourse ? 'Modifica Corso' : 'Nuovo Corso'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            {selectedCourse ? 'Modifica i dati del corso.' : 'Inserisci i dati del nuovo corso.'} I campi contrassegnati con * sono obbligatori.
          </p>
          <Input
            label="Titolo Corso *"
            name="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Es: Formazione Base Lavoratori"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Codice *"
              name="code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="Es: FBL-4H"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Corso *</label>
              <select
                name="type"
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {courseTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Durata (ore) *"
              name="durationHours"
              type="number"
              required
              min="1"
              value={formData.durationHours}
              onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
              placeholder="Es: 4"
            />
            <Input
              label="Prezzo (€)"
              name="defaultPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.defaultPrice}
              onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
              placeholder="Es: 150.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descrizione del corso..."
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-900 mb-2">Validità Attestato (D.Lgs. 81/08)</label>
            <p className="text-xs text-blue-700 mb-3">Indica dopo quanti mesi l'attestato scade e richiede un aggiornamento. Lascia vuoto se non ha scadenza.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validità (mesi)</label>
                <select
                  name="certificateValidityMonths"
                  value={formData.certificateValidityMonths}
                  onChange={(e) => setFormData({ ...formData, certificateValidityMonths: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Nessuna scadenza</option>
                  <option value="12">12 mesi (1 anno)</option>
                  <option value="24">24 mesi (2 anni)</option>
                  <option value="36">36 mesi (3 anni)</option>
                  <option value="60">60 mesi (5 anni)</option>
                </select>
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
            </div>
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
        message={`Sei sicuro di voler eliminare il corso "${selectedCourse?.title}"? Questa azione non può essere annullata e rimuoverà anche tutte le edizioni e iscrizioni associate.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}

      {/* Course Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Dettagli Corso: ${selectedCourse?.title}`}
        size="xl"
      >
        {isLoadingDetails ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : courseDetails ? (
          <div className="space-y-6">
            {/* Course Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Informazioni Corso</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Codice</p>
                  <p className="font-mono font-semibold">{courseDetails.course.code}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tipo</p>
                  <p className="font-semibold">{getTypeLabel(courseDetails.course.type)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Durata</p>
                  <p className="font-semibold">{courseDetails.course.durationHours} ore</p>
                </div>
                <div>
                  <p className="text-gray-600">Prezzo Base</p>
                  <p className="font-semibold">€{((courseDetails.course.defaultPrice || 0) / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Editions */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Edizioni ({courseDetails.editions.length})</h3>
              {courseDetails.editions.length === 0 ? (
                <p className="text-gray-500 text-sm">Nessuna edizione creata</p>
              ) : (
                <div className="space-y-4">
                  {courseDetails.editions.map((edition: any, idx: number) => (
                    <div key={edition.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Edizione {idx + 1}</p>
                          <p className="font-semibold">{new Date(edition.startDate).toLocaleDateString('it-IT')} - {new Date(edition.endDate).toLocaleDateString('it-IT')}</p>
                        </div>
                        <Badge variant={edition.isDedicated ? 'secondary' : 'success'}>
                          {edition.isDedicated ? 'Privata' : 'Multi-azienda'}
                        </Badge>
                      </div>

                      {/* Registrations */}
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Iscritti: {edition.totalRegistrations}</p>
                        {edition.registrations.length === 0 ? (
                          <p className="text-gray-500 text-xs">Nessun iscritto</p>
                        ) : (
                          <div className="space-y-2">
                            {edition.registrations.map((reg: any) => (
                              <div key={reg.id} className="bg-white border border-gray-100 rounded p-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="font-medium">{reg.studentName} {reg.studentLastName}</span>
                                  <span className="text-gray-600">€{(reg.priceApplied / 100).toFixed(2)}</span>
                                </div>
                                <div className="text-gray-600 mt-1">
                                  {reg.companyName && <p>Azienda: {reg.companyName}</p>}
                                  {reg.attendancePercent && <p>Presenze: {reg.attendancePercent}%</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Company Prices */}
                      {edition.companyPrices.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Prezzi per Azienda</p>
                          <div className="space-y-1">
                            {edition.companyPrices.map((cp: any) => (
                              <div key={cp.companyId} className="flex justify-between text-xs">
                                <span>{cp.companyName}</span>
                                <span className="font-semibold">€{(cp.price / 100).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
            Chiudi
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
