import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { studentsApi, companiesApi } from '../lib/api';
import { validaCF, reverseCF, formattaDataNascita } from '../lib/codiceFiscale';
import type { Student, Company } from '../types';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fiscalCode: '',
    email: '',
    phone: '',
    birthDate: '',
    birthPlace: '',
    address: '',
    companyId: '',
    jobRole: '',
    riskLevel: '',
  });

  // CF validation state
  const [cfValidation, setCfValidation] = useState<{
    isValid: boolean;
    isChecksumValid: boolean;
    warnings: string[];
    errors: string[];
  } | null>(null);
  const [cfAutoFilled, setCfAutoFilled] = useState<{
    birthDate: boolean;
    birthPlace: boolean;
  }>({ birthDate: false, birthPlace: false });
  const [duplicateStudent, setDuplicateStudent] = useState<{ id: number; name: string } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Fetch students
  const fetchStudents = useCallback(async (page = 1, searchTerm = '', companyId?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await studentsApi.getAll(page, pagination.pageSize, searchTerm, companyId);
      setStudents(response.data || []);
      setPagination({
        page: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError('Errore nel caricamento degli studenti');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  // Fetch companies for dropdown
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companiesApi.getAll(1, 100);
      setCompanies(response.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchStudents();
    fetchCompanies();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1, search, companyFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, companyFilter]);

  // CF validation and reverse engineering
  useEffect(() => {
    if (!formData.fiscalCode || formData.fiscalCode.length < 16) {
      setCfValidation(null);
      setCfAutoFilled({ birthDate: false, birthPlace: false });
      setDuplicateStudent(null);
      return;
    }

    // Validate CF
    const validation = validaCF(formData.fiscalCode);
    setCfValidation(validation);

    // Reverse engineering if valid format
    if (validation.isValid) {
      const reversed = reverseCF(formData.fiscalCode);
      
      // Auto-fill birth date if not already filled
      if (reversed.dataNascita && !formData.birthDate) {
        setFormData(prev => ({ ...prev, birthDate: reversed.dataNascita! }));
        setCfAutoFilled(prev => ({ ...prev, birthDate: true }));
      }
      
      // Auto-fill birth place if not already filled
      if (reversed.luogoNascita && !formData.birthPlace) {
        const luogo = reversed.provinciaNascita 
          ? `${reversed.luogoNascita} (${reversed.provinciaNascita})`
          : reversed.luogoNascita;
        setFormData(prev => ({ ...prev, birthPlace: luogo }));
        setCfAutoFilled(prev => ({ ...prev, birthPlace: true }));
      }
    }

    // Check for duplicates (debounced)
    const checkDuplicate = async () => {
      setIsCheckingDuplicate(true);
      try {
        const excludeId = selectedStudent?.id;
        const response = await fetch(
          `/api/students/check-duplicate?fiscalCode=${encodeURIComponent(formData.fiscalCode)}${excludeId ? `&excludeId=${excludeId}` : ''}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          }
        );
        const data = await response.json();
        if (data.isDuplicate) {
          setDuplicateStudent(data.existingStudent);
        } else {
          setDuplicateStudent(null);
        }
      } catch (err) {
        console.error('Error checking duplicate:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const timer = setTimeout(checkDuplicate, 300);
    return () => clearTimeout(timer);
  }, [formData.fiscalCode, selectedStudent?.id]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCompanyFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCompanyFilter(value ? Number(value) : undefined);
  };

  const handlePageChange = (page: number) => {
    fetchStudents(page, search, companyFilter);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      fiscalCode: '',
      email: '',
      phone: '',
      birthDate: '',
      birthPlace: '',
      address: '',
      companyId: '',
      jobRole: '',
      riskLevel: '',
    });
    setCfValidation(null);
    setCfAutoFilled({ birthDate: false, birthPlace: false });
    setDuplicateStudent(null);
  };

  const openCreateModal = () => {
    setSelectedStudent(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      fiscalCode: student.fiscalCode || '',
      email: student.email || '',
      phone: student.phone || '',
      birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
      birthPlace: student.birthPlace || '',
      address: student.address || '',
      companyId: student.companyId ? String(student.companyId) : '',
      jobRole: (student as any).jobRole || '',
      riskLevel: (student as any).riskLevel || '',
    });
    setCfAutoFilled({ birthDate: false, birthPlace: false });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const viewStudentDetail = (student: Student) => {
    navigate(`/students/${student.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Warning if duplicate found
    if (duplicateStudent) {
      const confirmProceed = window.confirm(
        `Attenzione: esiste già uno studente con questo codice fiscale (${duplicateStudent.name}). Vuoi continuare comunque?`
      );
      if (!confirmProceed) return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        companyId: formData.companyId ? Number(formData.companyId) : undefined,
        birthDate: formData.birthDate || undefined,
      };

      if (selectedStudent) {
        await studentsApi.update(selectedStudent.id, data);
        setMessage({ type: 'success', text: 'Studente aggiornato con successo' });
      } else {
        await studentsApi.create(data);
        setMessage({ type: 'success', text: 'Studente creato con successo' });
      }
      setIsModalOpen(false);
      fetchStudents(pagination.page, search, companyFilter);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving student:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      await studentsApi.delete(selectedStudent.id);
      setMessage({ type: 'success', text: 'Studente eliminato con successo' });
      setIsDeleteDialogOpen(false);
      fetchStudents(pagination.page, search, companyFilter);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting student:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nell\'eliminazione' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!students || students.length === 0) {
      setMessage({ type: 'error', text: 'Nessun dato da esportare' });
      return;
    }

    const headers = ['Nome', 'Cognome', 'Codice Fiscale', 'Email', 'Telefono', 'Data Nascita', 'Luogo Nascita', 'Indirizzo'];
    const rows = students.map(s => [
      s.firstName || '',
      s.lastName || '',
      s.fiscalCode || '',
      s.email || '',
      s.phone || '',
      s.birthDate ? new Date(s.birthDate).toLocaleDateString('it-IT') : '',
      s.birthPlace || '',
      s.address || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `studenti_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setMessage({ type: 'success', text: 'Export completato' });
    setTimeout(() => setMessage(null), 3000);
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return '-';
    const company = companies.find(c => c.id === companyId);
    return company?.name || '-';
  };

  // Get CF input border color based on validation
  const getCfBorderClass = () => {
    if (!cfValidation) return '';
    if (duplicateStudent) return 'border-orange-500 ring-1 ring-orange-500';
    if (!cfValidation.isChecksumValid) return 'border-yellow-500 ring-1 ring-yellow-500';
    if (cfValidation.isValid) return 'border-green-500 ring-1 ring-green-500';
    return 'border-red-500 ring-1 ring-red-500';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Studenti</h1>
            <p className="text-gray-600 mt-1">Gestisci gli studenti iscritti ai corsi di formazione</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="secondary">
              📥 Esporta
            </Button>
            <Button onClick={openCreateModal}>
              + Nuovo Studente
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            message.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
            {error}
            <button onClick={() => fetchStudents()} className="ml-4 underline">Riprova</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Cerca per nome, cognome, codice fiscale..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={companyFilter || ''}
            onChange={handleCompanyFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutte le aziende</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
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
            ) : students.length === 0 ? (
              <EmptyState
                title="Nessuno studente trovato"
                description={search || companyFilter ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo il primo studente'}
                action={
                  !search && !companyFilter && (
                    <Button onClick={openCreateModal}>
                      + Nuovo Studente
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
                      <TableHead>Codice Fiscale</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.firstName}</TableCell>
                        <TableCell>{student.lastName}</TableCell>
                        <TableCell className="font-mono text-sm">{student.fiscalCode || '-'}</TableCell>
                        <TableCell>{student.email || '-'}</TableCell>
                        <TableCell>{student.phone || '-'}</TableCell>
                        <TableCell>{getCompanyName(student.companyId)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => viewStudentDetail(student)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Visualizza dettaglio"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => openEditModal(student)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteDialog(student)}
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
        {!isLoading && students.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            Mostrati {students.length} di {pagination.total} studenti
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedStudent ? 'Modifica Studente' : 'Nuovo Studente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            {selectedStudent ? 'Modifica i dati dello studente.' : 'Inserisci i dati del nuovo studente.'} I campi contrassegnati con * sono obbligatori.
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

          {/* Codice Fiscale with validation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Codice Fiscale
              {isCheckingDuplicate && <span className="ml-2 text-gray-400 text-xs">Verifica in corso...</span>}
            </label>
            <input
              type="text"
              name="fiscalCode"
              maxLength={16}
              value={formData.fiscalCode}
              onChange={(e) => setFormData({ ...formData, fiscalCode: e.target.value.toUpperCase() })}
              placeholder="Es: RSSMRA80A01H501U"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase ${getCfBorderClass()}`}
            />
            
            {/* CF Validation Messages */}
            {cfValidation && !cfValidation.isChecksumValid && (
              <div className="mt-1 text-sm text-yellow-600 flex items-center gap-1">
                ⚠️ Attenzione: checksum non valido
              </div>
            )}
            {duplicateStudent && (
              <div className="mt-1 text-sm text-orange-600 flex items-center gap-1">
                ⚠️ CF già registrato per: <strong>{duplicateStudent.name}</strong>
              </div>
            )}
            {cfValidation?.isValid && cfValidation.isChecksumValid && !duplicateStudent && (
              <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
                ✓ Codice fiscale valido
              </div>
            )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data di Nascita
                {cfAutoFilled.birthDate && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">auto</span>
                )}
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={(e) => {
                  setFormData({ ...formData, birthDate: e.target.value });
                  setCfAutoFilled(prev => ({ ...prev, birthDate: false }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Luogo di Nascita
                {cfAutoFilled.birthPlace && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">auto</span>
                )}
              </label>
              <input
                type="text"
                name="birthPlace"
                value={formData.birthPlace}
                onChange={(e) => {
                  setFormData({ ...formData, birthPlace: e.target.value });
                  setCfAutoFilled(prev => ({ ...prev, birthPlace: false }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <Input
            label="Indirizzo"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          {/* D.Lgs. 81/08 Compliance Fields */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-blue-900 text-sm">Dati di Sicurezza (D.Lgs. 81/08)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mansione *
                </label>
                <select
                  name="jobRole"
                  value={formData.jobRole}
                  onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleziona mansione</option>
                  <option value="operaio">Operaio</option>
                  <option value="impiegato">Impiegato</option>
                  <option value="dirigente">Dirigente</option>
                  <option value="preposto">Preposto</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Livello Rischio *
                </label>
                <select
                  name="riskLevel"
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleziona livello rischio</option>
                  <option value="low">Basso</option>
                  <option value="medium">Medio</option>
                  <option value="high">Alto</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Azienda</label>
            <select
              name="companyId"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Nessuna azienda</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {selectedStudent ? 'Salva Modifiche' : 'Crea Studente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Studente"
        message={`Sei sicuro di voler eliminare lo studente "${selectedStudent?.firstName} ${selectedStudent?.lastName}"? Questa azione è irreversibile.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
