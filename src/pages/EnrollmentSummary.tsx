/**
 * Pagina Report: Riepilogo Iscrizioni per Attivazione Edizioni
 * Mostra le iscrizioni aggregate per tipo corso per decidere se attivare un'edizione
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface EnrollmentSummary {
  courseId: number;
  courseTitle: string;
  courseCode: string;
  courseType: string;
  pendingRegistrations: number;
  scheduledEditions: number;
  nextEditionId: number | null;
  nextEditionDate: string | null;
  nextEditionLocation: string | null;
  nextEditionMinParticipants: number;
  nextEditionMaxParticipants: number;
  nextEditionCurrentRegistrations: number;
  canActivate: boolean;
  activationMessage: string;
}

interface Stats {
  totalCourses: number;
  coursesReadyToActivate: number;
  coursesNeedMoreRegistrations: number;
  coursesWithoutEditions: number;
  totalPendingRegistrations: number;
}

export default function EnrollmentSummary() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<EnrollmentSummary[]>([]);
  const [byType, setByType] = useState<Record<string, EnrollmentSummary[]>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseTypeFilter, setCourseTypeFilter] = useState<string>('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (courseTypeFilter) params.append('courseType', courseTypeFilter);
      if (showOnlyPending) params.append('onlyPending', 'true');

      const response = await fetch(`/api/reports/enrollment-summary?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento');
      }

      const data = await response.json();
      setSummaries(data.summaries || []);
      setByType(data.byType || {});
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('Error fetching enrollment summary:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseTypeFilter, showOnlyPending]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  // Tipi corso unici
  const courseTypes = [...new Set(summaries.map(s => s.courseType))].filter(Boolean);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Riepilogo Iscrizioni</h1>
            <p className="text-gray-500">
              Verifica le iscrizioni per decidere se attivare le edizioni
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchData}>
              🔄 Aggiorna
            </Button>
            <Button onClick={() => navigate('/editions?action=create')}>
              + Nuova Edizione
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
                <p className="text-sm text-gray-500">Corsi attivi</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.coursesReadyToActivate}</p>
                <p className="text-sm text-gray-500">Pronti per attivazione</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.coursesNeedMoreRegistrations}</p>
                <p className="text-sm text-gray-500">Servono più iscritti</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.coursesWithoutEditions}</p>
                <p className="text-sm text-gray-500">Senza edizioni</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.totalPendingRegistrations}</p>
                <p className="text-sm text-gray-500">Iscrizioni totali</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtri */}
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={courseTypeFilter}
            onChange={(e) => setCourseTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti i tipi corso</option>
            {courseTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyPending}
              onChange={(e) => setShowOnlyPending(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Solo con iscrizioni</span>
          </label>

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Tabella
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchData} className="mt-2" size="sm">Riprova</Button>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : summaries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 text-lg">Nessun corso trovato</p>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          /* Vista Cards raggruppata per tipo */
          <div className="space-y-6">
            {Object.entries(byType).map(([type, typeSummaries]) => (
              <div key={type}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                    {type || 'Altro'}
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    {typeSummaries.length} cors{typeSummaries.length === 1 ? 'o' : 'i'}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeSummaries.map((summary) => (
                    <Card 
                      key={summary.courseId}
                      className={`${
                        summary.canActivate 
                          ? 'border-green-200 bg-green-50' 
                          : summary.nextEditionId 
                            ? 'border-yellow-200 bg-yellow-50'
                            : 'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{summary.courseTitle}</h4>
                            <p className="text-sm text-gray-500">{summary.courseCode}</p>
                          </div>
                          <span className={`text-2xl ${
                            summary.canActivate ? '' : summary.nextEditionId ? '' : ''
                          }`}>
                            {summary.canActivate ? '✅' : summary.nextEditionId ? '⏳' : '⚠️'}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Iscrizioni totali:</span>
                            <span className="font-medium">{summary.pendingRegistrations}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Edizioni programmate:</span>
                            <span className="font-medium">{summary.scheduledEditions}</span>
                          </div>
                        </div>

                        {summary.nextEditionId && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">PROSSIMA EDIZIONE:</p>
                            <p className="text-sm">📅 {formatDate(summary.nextEditionDate)}</p>
                            <p className="text-sm text-gray-500">📍 {summary.nextEditionLocation}</p>
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Iscritti</span>
                                <span>{summary.nextEditionCurrentRegistrations}/{summary.nextEditionMaxParticipants}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    summary.canActivate ? 'bg-green-500' : 'bg-yellow-500'
                                  }`}
                                  style={{ 
                                    width: `${Math.min(
                                      (summary.nextEditionCurrentRegistrations / summary.nextEditionMaxParticipants) * 100,
                                      100
                                    )}%` 
                                  }}
                                />
                              </div>
                              <p className="text-xs mt-1 text-gray-500">
                                Min. {summary.nextEditionMinParticipants} partecipanti
                              </p>
                            </div>
                          </div>
                        )}

                        <p className={`mt-3 text-sm font-medium ${
                          summary.canActivate ? 'text-green-700' : 'text-orange-700'
                        }`}>
                          {summary.activationMessage}
                        </p>

                        <div className="mt-3 flex gap-2">
                          {summary.nextEditionId ? (
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => navigate(`/registrations?editionId=${summary.nextEditionId}`)}
                            >
                              Gestisci Iscrizioni
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => navigate(`/editions?action=create&courseId=${summary.courseId}`)}
                            >
                              Crea Edizione
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Vista Tabella */
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corso</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Iscrizioni</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Edizioni</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prossima Edizione</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaries.map((summary) => (
                      <tr key={summary.courseId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{summary.courseTitle}</p>
                          <p className="text-xs text-gray-500">{summary.courseCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                            {summary.courseType || 'Altro'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-lg font-bold text-blue-600">
                            {summary.pendingRegistrations}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {summary.scheduledEditions}
                        </td>
                        <td className="px-4 py-3">
                          {summary.nextEditionId ? (
                            <div>
                              <p className="text-sm">{formatDate(summary.nextEditionDate)}</p>
                              <p className="text-xs text-gray-500">{summary.nextEditionLocation}</p>
                              <p className="text-xs text-gray-500">
                                {summary.nextEditionCurrentRegistrations}/{summary.nextEditionMaxParticipants} iscritti
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-orange-600">Nessuna</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {summary.canActivate ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                              ✅ Pronto
                            </span>
                          ) : summary.nextEditionId ? (
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                              ⏳ In attesa
                            </span>
                          ) : (
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                              ⚠️ No edizione
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {summary.nextEditionId ? (
                            <Button 
                              size="sm"
                              onClick={() => navigate(`/registrations?editionId=${summary.nextEditionId}`)}
                            >
                              Iscrizioni
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/editions?action=create&courseId=${summary.courseId}`)}
                            >
                              Crea
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
