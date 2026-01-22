import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { studentsApi, companiesApi } from '../lib/api';
import { debounce, formatDate } from '../lib/utils';
import type { Student, Company } from '../types';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
  });

  const fetchStudents = useCallback(async (page = 1, searchTerm = '', companyId?: number) => {
    setIsLoading(true);
    try {
      const response = await studentsApi.getAll(page, pagination.pageSize, searchTerm, companyId);
      setStudents(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  const fetchCompanies = async () => {
    try {
      const response = await companiesApi.getAll(1, 1000);
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCompanies();
  }, []);

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      fetchStudents(1, term, companyFilter);
    }, 300),
    [fetchStudents, companyFilter]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const handleCompanyFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : undefined;
    setCompanyFilter(value);
    fetchStudents(1, search, value);
  };

  const handlePageChange = (page: number) => {
    fetchStudents(page, search, companyFilter);
  };

  const openCreateModal = () => {
    setSelectedStudent(null);
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
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      fiscalCode: student.fiscalCode || '',
      email: student.email || '',
      phone: student.phone || '',
      birthDate: student.birthDate || '',
      birthPlace: student.birthPlace || '',
      address: student.address || '',
      companyId: student.companyId?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        companyId: formData.companyId ? parseInt(formData.companyId) : undefined,
      };
      if (selectedStudent) {
        await studentsApi.update(selectedStudent.id, data);
      } else {
        await studentsApi.create(data);
      }
      setIsModalOpen(false);
      fetchStudents(pagination.page, search, companyFilter);
    } catch (error) {
      console.error('Error saving student:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      await studentsApi.delete(selectedStudent.id);
      setIsDeleteDialogOpen(false);
      fetchStudents(pagination.page, search, companyFilter);
    } catch (error) {
      console.error('Error deleting student:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca studenti..."
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
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Nuovo Studente
          </Button>
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
                description={search ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo il primo studente'}
                action={
                  !search && (
                    <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      Nuovo Studente
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
                        <TableCell className="font-medium">
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>{student.fiscalCode || '-'}</TableCell>
                        <TableCell>{student.email || '-'}</TableCell>
                        <TableCell>{student.phone || '-'}</TableCell>
                        <TableCell>{student.company?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(student)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(student)}
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
        title={selectedStudent ? 'Modifica Studente' : 'Nuovo Studente'}
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
              label="Codice Fiscale"
              name="fiscalCode"
              value={formData.fiscalCode}
              onChange={(e) => setFormData({ ...formData, fiscalCode: e.target.value.toUpperCase() })}
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
            <Select
              label="Azienda"
              name="companyId"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data di Nascita"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            />
            <Input
              label="Luogo di Nascita"
              name="birthPlace"
              value={formData.birthPlace}
              onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
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
              {selectedStudent ? 'Salva Modifiche' : 'Crea Studente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Studente"
        message={`Sei sicuro di voler eliminare lo studente "${selectedStudent?.firstName} ${selectedStudent?.lastName}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
