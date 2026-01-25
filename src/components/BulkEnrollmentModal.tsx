import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import { editionsApi, studentsApi, registrationsApi, companiesApi } from '../lib/api';
import type { CourseEdition, Student, Company } from '../types';

interface BulkEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkEnrollmentModal({ isOpen, onClose, onSuccess }: BulkEnrollmentModalProps) {
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [editionsRes, studentsRes, companiesRes] = await Promise.all([
        editionsApi.getAll(1, 100), // Assuming max 100 editions for now
        studentsApi.getAll(1, 3000), // Fetch up to 3000 students
        companiesApi.getAll(1, 100), // Assuming max 100 companies for now
      ]);
      setEditions(editionsRes.data || []);
      setStudents(studentsRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
      setError('Errore nel caricamento dei dati per l\'iscrizione massiva.');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      resetState();
    }
  }, [isOpen, fetchDropdownData]);

  const resetState = () => {
    setSelectedEditionId(null);
    setSelectedCompanyIds([]);
    setSelectedStudentIds([]);
    setError(null);
    setMessage(null);
  };

  const handleCompanyToggle = (companyId: number) => {
    setSelectedCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = students.filter(student => {
    if (selectedCompanyIds.length === 0) return true;
    return student.companyId && selectedCompanyIds.includes(student.companyId);
  });

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleBulkEnrollment = async () => {
    if (!selectedEditionId || selectedStudentIds.length === 0) {
      setError('Seleziona un\'edizione e almeno uno studente.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await registrationsApi.bulkCreate({
        courseEditionId: selectedEditionId,
        studentIds: selectedStudentIds,
      });

      setMessage(`✅ Iscrizione massiva completata. ${response.successCount} studenti iscritti, ${response.failedCount} falliti (probabilmente già iscritti).`);
      onSuccess();
    } catch (err: any) {
      console.error('Error during bulk enrollment:', err);
      setError(err.response?.data?.error || 'Errore durante l\'iscrizione massiva.');
    } finally {
      setIsLoading(false);
    }
  };

  const isAllStudentsSelected = filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Iscrizione Massiva" size="5xl">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
            {message}
          </div>
        )}

        {/* Step 1: Select Edition */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3">1. Seleziona Edizione Corso *</h3>
            <select
              value={selectedEditionId || ''}
              onChange={(e) => setSelectedEditionId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona un'edizione</option>
              {editions.map(edition => (
                <option key={edition.id} value={edition.id}>
                  {edition.startDate} - {edition.location} (ID: {edition.id})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Step 2: Filter by Company (Optional) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3">2. Filtra per Azienda (Opzionale)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-2 border rounded-lg">
              {companies.map(company => (
                <div key={company.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`company-${company.id}`}
                    checked={selectedCompanyIds.includes(company.id)}
                    onCheckedChange={() => handleCompanyToggle(company.id)}
                  />
                  <label
                    htmlFor={`company-${company.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {company.name}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Select Students */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3">3. Seleziona Studenti da Iscrivere ({selectedStudentIds.length} selezionati) *</h3>
            <div className="flex items-center space-x-2 mb-3 border-b pb-2">
              <Checkbox
                id="select-all-students"
                checked={isAllStudentsSelected}
                onCheckedChange={handleSelectAllStudents}
                disabled={filteredStudents.length === 0}
              />
              <label
                htmlFor="select-all-students"
                className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Seleziona Tutti ({filteredStudents.length} totali)
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-gray-500 col-span-full">Nessuno studente trovato per i filtri selezionati.</p>
              ) : (
                filteredStudents.map(student => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <label
                      htmlFor={`student-${student.id}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {student.firstName} {student.lastName} ({companies.find(c => c.id === student.companyId)?.name || 'Nessuna Azienda'})
                    </label>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleBulkEnrollment}
            isLoading={isLoading}
            disabled={!selectedEditionId || selectedStudentIds.length === 0 || isLoading}
          >
            Iscrivi {selectedStudentIds.length} Studenti
          </Button>
        </div>
      </div>
    </Modal>
  );
}
