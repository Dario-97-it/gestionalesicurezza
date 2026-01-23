import React, { useState, useEffect, useRef } from 'react';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { exportToExcel } from '../lib/excel';

interface ReportData {
  // KPI principali
  kpi: {
    totalStudents: number;
    totalCompanies: number;
    totalCourses: number;
    totalEditions: number;
    totalRegistrations: number;
    totalRevenue: number;
    avgStudentsPerEdition: number;
    avgRevenuePerStudent: number;
  };
  // Andamento mensile
  monthlyTrend: Array<{
    month: string;
    registrations: number;
    revenue: number;
    editions: number;
  }>;
  // Top corsi
  topCourses: Array<{
    id: number;
    title: string;
    registrations: number;
    revenue: number;
  }>;
  // Top aziende
  topCompanies: Array<{
    id: number;
    name: string;
    students: number;
    registrations: number;
    revenue: number;
  }>;
  // Distribuzione per tipo corso
  coursesByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  // Docenti performance
  instructorsPerformance: Array<{
    id: number;
    name: string;
    courses: number;
    hours: number;
    students: number;
  }>;
}

// Funzione per ottenere i dati report
async function fetchReportData(year: number): Promise<ReportData> {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`/api/reports?year=${year}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Errore nel caricamento dei report');
  }

  return response.json();
}

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadReports();
  }, [selectedYear]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const reportData = await fetchReportData(selectedYear);
      setData(reportData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Errore nel caricamento');
      // Dati di esempio per test
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleExportKPI = () => {
    if (!data) return;
    
    const exportData = [
      { 'KPI': 'Studenti Totali', 'Valore': data.kpi.totalStudents },
      { 'KPI': 'Aziende Totali', 'Valore': data.kpi.totalCompanies },
      { 'KPI': 'Corsi Attivi', 'Valore': data.kpi.totalCourses },
      { 'KPI': 'Edizioni Anno', 'Valore': data.kpi.totalEditions },
      { 'KPI': 'Iscrizioni Anno', 'Valore': data.kpi.totalRegistrations },
      { 'KPI': 'Fatturato Anno', 'Valore': formatCurrency(data.kpi.totalRevenue) },
      { 'KPI': 'Media Studenti/Edizione', 'Valore': data.kpi.avgStudentsPerEdition.toFixed(1) },
      { 'KPI': 'Fatturato Medio/Studente', 'Valore': formatCurrency(data.kpi.avgRevenuePerStudent) },
    ];

    exportToExcel(exportData, `report_kpi_${selectedYear}`);
  };

  const handleExportMonthly = () => {
    if (!data) return;
    
    const exportData = data.monthlyTrend.map(m => ({
      'Mese': m.month,
      'Iscrizioni': m.registrations,
      'Edizioni': m.editions,
      'Fatturato': formatCurrency(m.revenue),
    }));

    exportToExcel(exportData, `report_mensile_${selectedYear}`);
  };

  // Genera anni disponibili (ultimi 5 anni)
  const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Calcola altezza barre per grafico
  const getBarHeight = (value: number, max: number) => {
    return max > 0 ? Math.max((value / max) * 100, 4) : 4;
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report e Statistiche</h1>
            <p className="text-gray-500">Analisi dati e performance aziendale</p>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={handleExportKPI}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Esporta KPI
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <Button onClick={loadReports} className="mt-2" size="sm">Riprova</Button>
          </div>
        )}

        {data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserGroupIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Studenti</p>
                      <p className="text-2xl font-bold text-gray-900">{data.kpi.totalStudents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Aziende</p>
                      <p className="text-2xl font-bold text-gray-900">{data.kpi.totalCompanies}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Edizioni {selectedYear}</p>
                      <p className="text-2xl font-bold text-gray-900">{data.kpi.totalEditions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <CurrencyEuroIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fatturato {selectedYear}</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(data.kpi.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI Secondari */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{data.kpi.totalRegistrations}</p>
                  <p className="text-sm text-gray-500">Iscrizioni {selectedYear}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{data.kpi.avgStudentsPerEdition.toFixed(1)}</p>
                  <p className="text-sm text-gray-500">Media Studenti/Edizione</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.kpi.avgRevenuePerStudent)}</p>
                  <p className="text-sm text-gray-500">Fatturato Medio/Studente</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{data.kpi.totalCourses}</p>
                  <p className="text-sm text-gray-500">Corsi Attivi</p>
                </CardContent>
              </Card>
            </div>

            {/* Grafico Andamento Mensile */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                  Andamento Mensile {selectedYear}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleExportMonthly}>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {data.monthlyTrend.length > 0 ? (
                  <>
                    <div className="flex items-end gap-2 h-48 mb-4">
                      {data.monthlyTrend.map((month, index) => {
                        const maxReg = Math.max(...data.monthlyTrend.map(m => m.registrations), 1);
                        const height = getBarHeight(month.registrations, maxReg);
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center group relative">
                            <div 
                              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                              style={{ height: `${height}%` }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                  <p>{month.registrations} iscrizioni</p>
                                  <p>{formatCurrency(month.revenue)}</p>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                              {month.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-8 text-sm text-gray-600 mt-8">
                      <span>
                        Totale Iscrizioni: <strong>{data.monthlyTrend.reduce((sum, m) => sum + m.registrations, 0)}</strong>
                      </span>
                      <span>
                        Totale Fatturato: <strong>{formatCurrency(data.monthlyTrend.reduce((sum, m) => sum + m.revenue, 0))}</strong>
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nessun dato disponibile</p>
                )}
              </CardContent>
            </Card>

            {/* Top Corsi e Top Aziende */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Top Corsi */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AcademicCapIcon className="h-5 w-5 text-purple-600" />
                    Top 5 Corsi per Iscrizioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topCourses.length > 0 ? (
                    <div className="space-y-3">
                      {data.topCourses.map((course, index) => (
                        <div key={course.id} className="flex items-center gap-3">
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{course.title}</p>
                            <p className="text-sm text-gray-500">
                              {course.registrations} iscrizioni • {formatCurrency(course.revenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nessun dato disponibile</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Aziende */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BuildingOfficeIcon className="h-5 w-5 text-green-600" />
                    Top 5 Aziende per Fatturato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topCompanies.length > 0 ? (
                    <div className="space-y-3">
                      {data.topCompanies.map((company, index) => (
                        <div key={company.id} className="flex items-center gap-3">
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{company.name}</p>
                            <p className="text-sm text-gray-500">
                              {company.students} studenti • {company.registrations} iscrizioni • {formatCurrency(company.revenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nessun dato disponibile</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Distribuzione Corsi per Tipo */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Corsi per Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {data.coursesByType.length > 0 ? (
                  <div className="space-y-3">
                    {data.coursesByType.map((type) => (
                      <div key={type.type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium capitalize">{type.type || 'Altro'}</span>
                          <span className="text-gray-500">{type.count} corsi ({type.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${type.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">Nessun dato disponibile</p>
                )}
              </CardContent>
            </Card>

            {/* Performance Docenti */}
            {data.instructorsPerformance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserGroupIcon className="h-5 w-5 text-pink-600" />
                    Performance Docenti {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Corsi</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ore</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Studenti</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.instructorsPerformance.map((instructor) => (
                          <tr key={instructor.id}>
                            <td className="px-4 py-3 font-medium text-gray-900">{instructor.name}</td>
                            <td className="px-4 py-3 text-center text-gray-500">{instructor.courses}</td>
                            <td className="px-4 py-3 text-center text-gray-500">{instructor.hours}</td>
                            <td className="px-4 py-3 text-center text-gray-500">{instructor.students}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
