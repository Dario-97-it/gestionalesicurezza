import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { companiesApi } from '../lib/api';
import { validaPIVA, normalizzaPIVA, formattaPIVA } from '../lib/partitaIva';
import type { Company } from '../types';

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    vatNumber: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
  });

  // P.IVA validation state
  const [pivaValidation, setPivaValidation] = useState<{
    isValid: boolean;
    isChecksumValid: boolean;
    warnings: string[];
    errors: string[];
  } | null>(null);
  const [duplicateCompany, setDuplicateCompany] = useState<{ id: number; name: string } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Fetch companies
  const fetchCompanies = useCallback(async (page = 1, searchTerm = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await companiesApi.getAll(page, pagination.pageSize, searchTerm);
      setCompanies(response.data || []);
      setPagination({
        page: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError('Errore nel caricamento delle aziende');
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  // Load companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // P.IVA validation
  useEffect(() => {
    const piva = formData.vatNumber;
    if (!piva || piva.length < 11) {
      setPivaValidation(null);
      setDuplicateCompany(null);
      return;
    }

    // Validate P.IVA
    const validation = validaPIVA(piva);
    setPivaValidation(validation);

    // Check for duplicates (debounced)
    if (validation.isValid) {
      const checkDuplicate = async () => {
        setIsCheckingDuplicate(true);
        try {
          const excludeId = selectedCompany?.id;
          const normalizedPiva = normalizzaPIVA(piva);
          const response = await fetch(
            `/api/companies/check-duplicate?vatNumber=${encodeURIComponent(normalizedPiva)}${excludeId ? `&excludeId=${excludeId}` : ''}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
              }
            }
          );
          const data = await response.json();
          if (data.isDuplicate) {
            setDuplicateCompany(data.existingCompany);
          } else {
            setDuplicateCompany(null);
          }
        } catch (err) {
          console.error('Error checking duplicate:', err);
        } finally {
          setIsCheckingDuplicate(false);
        }
      };

      const timer = setTimeout(checkDuplicate, 300);
      return () => clearTimeout(timer);
    }
  }, [formData.vatNumber, selectedCompany?.id]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handlePageChange = (page: number) => {
    fetchCompanies(page, search);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      vatNumber: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
    });
    setPivaValidation(null);
    setDuplicateCompany(null);
  };

  const openCreateModal = () => {
    setSelectedCompany(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name || '',
      vatNumber: company.vatNumber || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      contactPerson: company.contactPerson || '',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const viewCompanyDetail = (company: Company) => {
    navigate(`/companies/${company.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Warning if duplicate found
    if (duplicateCompany) {
      const confirmProceed = window.confirm(
        `Attenzione: esiste già un'azienda con questa partita IVA (${duplicateCompany.name}). Vuoi continuare comunque?`
      );
      if (!confirmProceed) return;
    }

    setIsSaving(true);
    try {
      // Normalize P.IVA before saving
      const dataToSave = {
        ...formData,
        vatNumber: formData.vatNumber ? normalizzaPIVA(formData.vatNumber) : '',
      };

      if (selectedCompany) {
        await companiesApi.update(selectedCompany.id, dataToSave);
        setMessage({ type: 'success', text: 'Azienda aggiornata con successo' });
      } else {
        await companiesApi.create(dataToSave);
        setMessage({ type: 'success', text: 'Azienda creata con successo' });
      }
      setIsModalOpen(false);
      fetchCompanies(pagination.page, search);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving company:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    setIsSaving(true);
    try {
      await companiesApi.delete(selectedCompany.id);
      setMessage({ type: 'success', text: 'Azienda eliminata con successo' });
      setIsDeleteDialogOpen(false);
      fetchCompanies(pagination.page, search);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting company:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore nell\'eliminazione' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!companies || companies.length === 0) {
      setMessage({ type: 'error', text: 'Nessun dato da esportare' });
      return;
    }

    const headers = ['Nome', 'Partita IVA', 'Email', 'Telefono', 'Indirizzo', 'Persona di Contatto'];
    const rows = companies.map(c => [
      c.name || '',
      c.vatNumber || '',
      c.email || '',
      c.phone || '',
      c.address || '',
      c.contactPerson || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aziende_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setMessage({ type: 'success', text: 'Export completato' });
    setTimeout(() => setMessage(null), 3000);
  };

  // Get P.IVA input border color based on validation
  const getPivaBorderClass = () => {
    if (!pivaValidation) return '';
    if (duplicateCompany) return 'border-orange-500 ring-1 ring-orange-500';
    if (!pivaValidation.isChecksumValid) return 'border-yellow-500 ring-1 ring-yellow-500';
    if (pivaValidation.isValid) return 'border-green-500 ring-1 ring-green-500';
    return 'border-red-500 ring-1 ring-red-500';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Aziende</h1>
            <p className="text-gray-600 mt-1">Gestione aziende clienti</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="secondary">
              📥 Esporta
            </Button>
            <Button onClick={openCreateModal}>
              + Nuova Azienda
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
            <button onClick={() => fetchCompanies()} className="ml-4 underline">Riprova</button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Cerca per nome, partita IVA, email..."
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
            ) : companies.length === 0 ? (
              <EmptyState
                title="Nessuna azienda trovata"
                description={search ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo la prima azienda'}
                action={
                  !search && (
                    <Button onClick={openCreateModal}>
                      + Nuova Azienda
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
                      <TableHead>P.IVA</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Referente</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell className="font-mono text-sm">{company.vatNumber || '-'}</TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        <TableCell>{company.phone || '-'}</TableCell>
                        <TableCell>{company.contactPerson || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => viewCompanyDetail(company)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Visualizza dettaglio"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => openEditModal(company)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteDialog(company)}
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
        {!isLoading && companies.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            Mostrati {companies.length} di {pagination.total} aziende
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCompany ? 'Modifica Azienda' : 'Nuova Azienda'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            {selectedCompany ? 'Modifica i dati dell\'azienda.' : 'Inserisci i dati della nuova azienda.'} I campi contrassegnati con * sono obbligatori.
          </p>

          <Input
            label="Nome Azienda *"
            name="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          {/* Partita IVA with validation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Partita IVA
              {isCheckingDuplicate && <span className="ml-2 text-gray-400 text-xs">Verifica in corso...</span>}
            </label>
            <input
              type="text"
              name="vatNumber"
              maxLength={13}
              value={formData.vatNumber}
              onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="Es: 12345678901"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${getPivaBorderClass()}`}
            />
            
            {/* P.IVA Validation Messages */}
            {pivaValidation && !pivaValidation.isChecksumValid && pivaValidation.isValid && (
              <div className="mt-1 text-sm text-yellow-600 flex items-center gap-1">
                ⚠️ Attenzione: checksum non valido
              </div>
            )}
            {pivaValidation && pivaValidation.errors.length > 0 && (
              <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                ❌ {pivaValidation.errors[0]}
              </div>
            )}
            {duplicateCompany && (
              <div className="mt-1 text-sm text-orange-600 flex items-center gap-1">
                ⚠️ P.IVA già registrata per: <strong>{duplicateCompany.name}</strong>
              </div>
            )}
            {pivaValidation?.isValid && pivaValidation.isChecksumValid && !duplicateCompany && (
              <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
                ✓ Partita IVA valida
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

          <Input
            label="Indirizzo"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Persona di Contatto"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {selectedCompany ? 'Salva Modifiche' : 'Crea Azienda'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Azienda"
        message={`Sei sicuro di voler eliminare l'azienda "${selectedCompany?.name}"? Questa azione è irreversibile.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
