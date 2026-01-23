import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { exportToExcel } from '../lib/excel';

interface Certificate {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseCode: string;
  companyId: number;
  companyName: string;
  completionDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  urgency: 'expired' | 'high' | 'medium' | 'low';
  validityMonths: number;
}

// API per ottenere le scadenze attestati
async function fetchCertificates(filters: {
  search?: string;
  urgency?: string;
  companyId?: number;
}): Promise<Certificate[]> {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.urgency) params.append('urgency', filters.urgency);
  if (filters.companyId) params.append('companyId', String(filters.companyId));

  const response = await fetch(`/api/certificates?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Errore nel caricamento degli attestati');
  }

  return response.json();
}

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, [urgencyFilter]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const data = await fetchCertificates({ 
        search, 
        urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined 
      });
      setCertificates(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading certificates:', err);
      setError(err.message || 'Errore nel caricamento');
      // Dati di esempio per test
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCertificates();
  };

  const handleExport = () => {
    const exportData = filteredCertificates.map(cert => ({
      'Studente': cert.studentName,
      'Email': cert.studentEmail,
      'Azienda': cert.companyName,
      'Corso': cert.courseTitle,
      'Codice Corso': cert.courseCode,
      'Data Completamento': cert.completionDate,
      'Data Scadenza': cert.expiryDate,
      'Giorni alla Scadenza': cert.daysUntilExpiry,
      'Urgenza': cert.urgency === 'expired' ? 'SCADUTO' :
                 cert.urgency === 'high' ? 'URGENTE' :
                 cert.urgency === 'medium' ? 'IN SCADENZA' : 'DA PIANIFICARE',
    }));

    exportToExcel(exportData, 'scadenzario_attestati');
  };

  const getUrgencyBadge = (urgency: string, days: number) => {
    switch (urgency) {
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">
            SCADUTO da {Math.abs(days)} gg
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ⚠️ {days} giorni
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⏰ {days} giorni
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ {days} giorni
          </span>
        );
      default:
        return null;
    }
  };

  const getRowClass = (urgency: string) => {
    switch (urgency) {
      case 'expired': return 'bg-gray-100 border-l-4 border-l-gray-800';
      case 'high': return 'bg-red-50 border-l-4 border-l-red-500';
      case 'medium': return 'bg-yellow-50 border-l-4 border-l-yellow-500';
      case 'low': return 'bg-green-50 border-l-4 border-l-green-500';
      default: return '';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filtra per ricerca locale
  const filteredCertificates = certificates.filter(cert => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cert.studentName.toLowerCase().includes(searchLower) ||
      cert.companyName.toLowerCase().includes(searchLower) ||
      cert.courseTitle.toLowerCase().includes(searchLower)
    );
  });

  // Raggruppa per urgenza
  const groupedByUrgency = {
    expired: filteredCertificates.filter(c => c.urgency === 'expired'),
    high: filteredCertificates.filter(c => c.urgency === 'high'),
    medium: filteredCertificates.filter(c => c.urgency === 'medium'),
    low: filteredCertificates.filter(c => c.urgency === 'low'),
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scadenzario Attestati</h1>
            <p className="text-gray-500">Monitora le scadenze degli attestati di formazione</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
              <FunnelIcon className="h-4 w-4 mr-1" />
              Filtri
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Esporta
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="bg-gray-800 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Scaduti</p>
                  <p className="text-2xl font-bold">{groupedByUrgency.expired.length}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Urgenti (30gg)</p>
                  <p className="text-2xl font-bold">{groupedByUrgency.high.length}</p>
                </div>
                <CalendarDaysIcon className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">In Scadenza (60gg)</p>
                  <p className="text-2xl font-bold">{groupedByUrgency.medium.length}</p>
                </div>
                <CalendarDaysIcon className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Da Pianificare (90gg)</p>
                  <p className="text-2xl font-bold">{groupedByUrgency.low.length}</p>
                </div>
                <CalendarDaysIcon className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Cerca per studente, azienda o corso..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                  />
                </div>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tutte le urgenze</option>
                  <option value="expired">Scaduti</option>
                  <option value="high">Urgenti (0-30 gg)</option>
                  <option value="medium">In scadenza (30-60 gg)</option>
                  <option value="low">Da pianificare (60-90 gg)</option>
                </select>
                <Button type="submit">Cerca</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <Button onClick={loadCertificates} className="mt-2" size="sm">Riprova</Button>
          </div>
        )}

        {/* Certificates Table */}
        {!loading && !error && (
          <Card>
            <CardContent className="p-0">
              {filteredCertificates.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nessun attestato in scadenza trovato</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Gli attestati appariranno qui quando saranno prossimi alla scadenza
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Studente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Azienda
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Corso
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Completato
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Scadenza
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Stato
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCertificates.map((cert) => (
                        <tr key={cert.id} className={getRowClass(cert.urgency)}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{cert.studentName}</p>
                              <p className="text-sm text-gray-500">{cert.studentEmail}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {cert.companyName}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{cert.courseTitle}</p>
                              <p className="text-xs text-gray-500">{cert.courseCode}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(cert.completionDate)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {formatDate(cert.expiryDate)}
                          </td>
                          <td className="px-4 py-3">
                            {getUrgencyBadge(cert.urgency, cert.daysUntilExpiry)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Link to={`/students/${cert.studentId}`}>
                                <Button variant="ghost" size="sm" title="Vedi studente">
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Invia promemoria"
                                onClick={() => {
                                  // TODO: Implementare invio email
                                  alert(`Invio promemoria a ${cert.studentEmail}`);
                                }}
                              >
                                <EnvelopeIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legenda */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Legenda</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-800 rounded"></div>
                <span>Scaduto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Urgente (0-30 giorni)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>In scadenza (30-60 giorni)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Da pianificare (60-90 giorni)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
