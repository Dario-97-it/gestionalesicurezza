import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CurrencyEuroIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { SystemUpdatesNotification } from '../components/ui/NotificationBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { dashboardApi } from '../lib/api';

interface DashboardData {
  counts: {
    companies: number;
    students: number;
    courses: number;
    instructors: number;
  };
  thisMonth: {
    editions: number;
    registrations: number;
    revenue: number;
  };
  thisYear: {
    editions: number;
    registrations: number;
    revenue: number;
  };
  upcomingEditions: Array<{
    id: number;
    startDate: string;
    endDate: string;
    location: string;
    status: string;
    maxParticipants: number;
    courseTitle: string;
    courseCode: string;
    enrolledCount: number;
  }>;
  ongoingEditions: Array<{
    id: number;
    startDate: string;
    endDate: string;
    location: string;
    courseTitle: string;
  }>;
  recentRegistrations: Array<{
    id: number;
    registrationDate: string;
    status: string;
    studentName: string;
    courseTitle: string;
    companyName: string;
  }>;
  expiringCertificates: Array<{
    id: number;
    studentId: number;
    studentName: string;
    courseTitle: string;
    companyName: string;
    expiryDate: string;
    daysUntilExpiry: number;
    urgency: 'high' | 'medium' | 'low';
  }>;
  expiringCount: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  charts: {
    monthlyData: Array<{
      month: string;
      registrations: number;
      revenue: number;
    }>;
    coursesByType: Array<{
      type: string;
      count: number;
    }>;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getStats();
      setData(response);
      setError(null);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Errore nel caricamento della dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <Button onClick={loadDashboard} className="mt-2">Riprova</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-2">Benvenuto in SecurityTools</h1>
          <p className="text-blue-100">Gestionale corsi sicurezza sul lavoro D.Lgs. 81/08</p>
        </div>

        {/* Notifica Novità Sistema */}
        <SystemUpdatesNotification />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Aziende</p>
                  <p className="text-2xl font-bold text-blue-900">{data?.counts.companies || 0}</p>
                </div>
                <BuildingOfficeIcon className="h-10 w-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Studenti</p>
                  <p className="text-2xl font-bold text-green-900">{data?.counts.students || 0}</p>
                </div>
                <UserGroupIcon className="h-10 w-10 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Corsi Attivi</p>
                  <p className="text-2xl font-bold text-purple-900">{data?.counts.courses || 0}</p>
                </div>
                <AcademicCapIcon className="h-10 w-10 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Docenti</p>
                  <p className="text-2xl font-bold text-orange-900">{data?.counts.instructors || 0}</p>
                </div>
                <UserGroupIcon className="h-10 w-10 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistiche Periodo */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Questo Mese */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                Questo Mese
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{data?.thisMonth.editions || 0}</p>
                  <p className="text-xs text-blue-600">Edizioni</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{data?.thisMonth.registrations || 0}</p>
                  <p className="text-xs text-green-600">Iscrizioni</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(data?.thisMonth.revenue || 0)}</p>
                  <p className="text-xs text-purple-600">Fatturato</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quest'Anno */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                Quest'Anno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{data?.thisYear.editions || 0}</p>
                  <p className="text-xs text-blue-600">Edizioni</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{data?.thisYear.registrations || 0}</p>
                  <p className="text-xs text-green-600">Iscrizioni</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(data?.thisYear.revenue || 0)}</p>
                  <p className="text-xs text-purple-600">Fatturato</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Scadenze */}
        {data?.expiringCount && data.expiringCount.total > 0 && (
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <ExclamationTriangleIcon className="h-5 w-5" />
                Attestati in Scadenza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {data.expiringCount.high} urgenti
                  </span>
                  <span className="text-xs text-gray-500">(entro 30gg)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {data.expiringCount.medium} in scadenza
                  </span>
                  <span className="text-xs text-gray-500">(30-60gg)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {data.expiringCount.low} da pianificare
                  </span>
                  <span className="text-xs text-gray-500">(60-90gg)</span>
                </div>
              </div>
              
              {data.expiringCertificates && data.expiringCertificates.length > 0 && (
                <div className="space-y-2">
                  {data.expiringCertificates.slice(0, 5).map((cert) => (
                    <div 
                      key={cert.id} 
                      className={`flex items-center justify-between p-2 rounded border ${getUrgencyColor(cert.urgency)}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{cert.studentName}</p>
                        <p className="text-xs opacity-75">{cert.courseTitle} • {cert.companyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatDate(cert.expiryDate)}</p>
                        <p className="text-xs opacity-75">{cert.daysUntilExpiry} giorni</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Link to="/certificates" className="block mt-3">
                <Button variant="secondary" size="sm" className="w-full">
                  Vedi Scadenzario Completo →
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Widget Prossime Edizioni e Ultime Iscrizioni */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Prossime Edizioni */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                Prossime Edizioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.upcomingEditions && data.upcomingEditions.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingEditions.slice(0, 5).map((edition) => (
                    <Link 
                      key={edition.id} 
                      to={`/editions/${edition.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{edition.courseTitle}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(edition.startDate)} • {edition.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            edition.enrolledCount >= (edition.maxParticipants || 999)
                              ? 'bg-red-100 text-red-700'
                              : edition.enrolledCount >= (edition.maxParticipants || 999) * 0.8
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {edition.enrolledCount}/{edition.maxParticipants || '∞'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nessuna edizione programmata</p>
              )}
              <Link to="/editions" className="block mt-3">
                <Button variant="secondary" size="sm" className="w-full">
                  Vedi Tutte le Edizioni →
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Ultime Iscrizioni */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-600" />
                Ultime Iscrizioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentRegistrations && data.recentRegistrations.length > 0 ? (
                <div className="space-y-3">
                  {data.recentRegistrations.map((reg) => (
                    <div key={reg.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{reg.studentName}</p>
                          <p className="text-sm text-gray-500">{reg.courseTitle}</p>
                          <p className="text-xs text-gray-400">{reg.companyName}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            reg.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            reg.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {reg.status === 'confirmed' ? 'Confermata' : 
                             reg.status === 'pending' ? 'In attesa' : reg.status}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(reg.registrationDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nessuna iscrizione recente</p>
              )}
              <Link to="/registrations" className="block mt-3">
                <Button variant="secondary" size="sm" className="w-full">
                  Vedi Tutte le Iscrizioni →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Grafico Andamento (semplificato senza Chart.js) */}
        {data?.charts?.monthlyData && data.charts.monthlyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
                Andamento Iscrizioni (ultimi 12 mesi)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {data.charts.monthlyData.map((month, index) => {
                  const maxReg = Math.max(...data.charts.monthlyData.map(m => m.registrations), 1);
                  const height = (month.registrations / maxReg) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${month.month}: ${month.registrations} iscrizioni`}
                      />
                      <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                        {month.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex justify-center gap-6 text-sm text-gray-600">
                <span>
                  Totale: <strong>{data.charts.monthlyData.reduce((sum, m) => sum + m.registrations, 0)}</strong> iscrizioni
                </span>
                <span>
                  Media: <strong>{Math.round(data.charts.monthlyData.reduce((sum, m) => sum + m.registrations, 0) / 12)}</strong>/mese
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              <Link
                to="/companies"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all"
              >
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Aziende</span>
              </Link>
              <Link
                to="/students"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all"
              >
                <UserGroupIcon className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Studenti</span>
              </Link>
              <Link
                to="/courses"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all"
              >
                <AcademicCapIcon className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Corsi</span>
              </Link>
              <Link
                to="/editions"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all"
              >
                <CalendarDaysIcon className="h-8 w-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Edizioni</span>
              </Link>
              <Link
                to="/registrations"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg hover:from-red-100 hover:to-red-200 transition-all"
              >
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Iscrizioni</span>
              </Link>
              <Link
                to="/attendances"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg hover:from-indigo-100 hover:to-indigo-200 transition-all"
              >
                <ClockIcon className="h-8 w-8 text-indigo-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Presenze</span>
              </Link>
              <Link
                to="/instructors"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg hover:from-pink-100 hover:to-pink-200 transition-all"
              >
                <UserGroupIcon className="h-8 w-8 text-pink-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Docenti</span>
              </Link>
              <Link
                to="/reports"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg hover:from-cyan-100 hover:to-cyan-200 transition-all"
              >
                <ChartBarIcon className="h-8 w-8 text-cyan-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Report</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
