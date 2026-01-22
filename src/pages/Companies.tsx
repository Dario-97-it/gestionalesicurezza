import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { companiesApi } from '../lib/api';
import { debounce } from '../lib/utils';
import type { Company, PaginatedResponse } from '../types';

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    vatNumber: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
  });

  const fetchCompanies = useCallback(async (page = 1, searchTerm = '') => {
    setIsLoading(true);
    try {
      const response = await companiesApi.getAll(page, pagination.pageSize, searchTerm);
      setCompanies(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      fetchCompanies(1, term);
    }, 300),
    [fetchCompanies]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const handlePageChange = (page: number) => {
    fetchCompanies(page, search);
  };

  const openCreateModal = () => {
    setSelectedCompany(null);
    setFormData({
      name: '',
      vatNumber: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (selectedCompany) {
        await companiesApi.update(selectedCompany.id, formData);
      } else {
        await companiesApi.create(formData);
      }
      setIsModalOpen(false);
      fetchCompanies(pagination.page, search);
    } catch (error) {
      console.error('Error saving company:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    setIsSaving(true);
    try {
      await companiesApi.delete(selectedCompany.id);
      setIsDeleteDialogOpen(false);
      fetchCompanies(pagination.page, search);
    } catch (error) {
      console.error('Error deleting company:', error);
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
              placeholder="Cerca aziende..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Nuova Azienda
          </Button>
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
                    <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      Nuova Azienda
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
                        <TableCell>{company.vatNumber || '-'}</TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        <TableCell>{company.phone || '-'}</TableCell>
                        <TableCell>{company.contactPerson || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(company)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(company)}
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
        title={selectedCompany ? 'Modifica Azienda' : 'Nuova Azienda'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome Azienda *"
            name="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Partita IVA"
              name="vatNumber"
              value={formData.vatNumber}
              onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefono"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Referente"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
          </div>
          <Input
            label="Indirizzo"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Azienda"
        message={`Sei sicuro di voler eliminare l'azienda "${selectedCompany?.name}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
