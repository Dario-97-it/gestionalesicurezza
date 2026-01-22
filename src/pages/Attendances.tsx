import React, { useEffect, useState, useCallback } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { attendancesApi, editionsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { CourseEdition, Attendance } from '../types';

export default function Attendances() {
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEditions = async () => {
    try {
      const response = await editionsApi.getAll(1, 1000, 'ongoing');
      setEditions(response.data);
      if (response.data.length > 0 && !selectedEditionId) {
        setSelectedEditionId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching editions:', error);
    }
  };

  const fetchAttendances = useCallback(async () => {
    if (!selectedEditionId) return;
    setIsLoading(true);
    try {
      const response = await attendancesApi.getByEdition(selectedEditionId, selectedDate);
      setAttendances(response);
    } catch (error) {
      console.error('Error fetching attendances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEditionId, selectedDate]);

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    if (selectedEditionId) {
      fetchAttendances();
    }
  }, [selectedEditionId, selectedDate, fetchAttendances]);

  const handleEditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEditionId(parseInt(e.target.value));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const toggleAttendance = async (studentId: number, registrationId: number, currentStatus: boolean) => {
    if (!selectedEditionId) return;
    setIsSaving(true);
    try {
      await attendancesApi.upsert({
        courseEditionId: selectedEditionId,
        studentId,
        registrationId,
        date: selectedDate,
        present: !currentStatus,
      });
      fetchAttendances();
    } catch (error) {
      console.error('Error updating attendance:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const markAllPresent = async () => {
    if (!selectedEditionId) return;
    setIsSaving(true);
    try {
      await attendancesApi.markAll(selectedEditionId, selectedDate, true);
      fetchAttendances();
    } catch (error) {
      console.error('Error marking all present:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const markAllAbsent = async () => {
    if (!selectedEditionId) return;
    setIsSaving(true);
    try {
      await attendancesApi.markAll(selectedEditionId, selectedDate, false);
      fetchAttendances();
    } catch (error) {
      console.error('Error marking all absent:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEdition = editions.find((e) => e.id === selectedEditionId);
  const presentCount = attendances.filter((a) => a.present).length;
  const totalCount = attendances.length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Edizione Corso
                </label>
                <select
                  value={selectedEditionId || ''}
                  onChange={handleEditionChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleziona un'edizione</option>
                  {editions.map((edition) => (
                    <option key={edition.id} value={edition.id}>
                      {edition.course?.title} - {formatDate(edition.startDate)} ({edition.location})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedEdition && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-sm text-gray-500">Presenti</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-sm text-gray-500">Assenti</p>
                <p className="text-2xl font-bold text-red-600">{totalCount - presentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-sm text-gray-500">Totale Iscritti</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Registro Presenze</CardTitle>
              {selectedEditionId && attendances.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={markAllPresent}
                    disabled={isSaving}
                  >
                    Tutti Presenti
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={markAllAbsent}
                    disabled={isSaving}
                  >
                    Tutti Assenti
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedEditionId ? (
              <EmptyState
                title="Seleziona un'edizione"
                description="Seleziona un'edizione corso per visualizzare e gestire le presenze"
              />
            ) : isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : attendances.length === 0 ? (
              <EmptyState
                title="Nessun iscritto"
                description="Non ci sono studenti iscritti a questa edizione"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studente</TableHead>
                    <TableHead>Azienda</TableHead>
                    <TableHead>Stato Iscrizione</TableHead>
                    <TableHead className="text-center">Presenza</TableHead>
                    <TableHead>Ore</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((attendance) => (
                    <TableRow key={attendance.id || `${attendance.studentId}-${attendance.registrationId}`}>
                      <TableCell className="font-medium">
                        {attendance.student?.firstName} {attendance.student?.lastName}
                      </TableCell>
                      <TableCell>{attendance.student?.company?.name || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={attendance.registration?.status || 'pending'} />
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => toggleAttendance(
                            attendance.studentId,
                            attendance.registrationId,
                            attendance.present
                          )}
                          disabled={isSaving}
                          className={`p-2 rounded-full transition-colors ${
                            attendance.present
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {attendance.present ? (
                            <CheckIcon className="h-5 w-5" />
                          ) : (
                            <XMarkIcon className="h-5 w-5" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>{attendance.hoursAttended || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{attendance.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
