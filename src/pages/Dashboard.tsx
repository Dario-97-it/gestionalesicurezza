import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { dashboardApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { DashboardStats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Errore nel caricamento delle statistiche');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Aziende"
            value={stats?.totalCompanies || 0}
            icon={<BuildingOfficeIcon className="h-6 w-6" />}
          />
          <StatCard
            title="Studenti"
            value={stats?.totalStudents || 0}
            icon={<UserGroupIcon className="h-6 w-6" />}
          />
          <StatCard
            title="Corsi"
            value={stats?.totalCourses || 0}
            icon={<AcademicCapIcon className="h-6 w-6" />}
          />
          <StatCard
            title="Edizioni Attive"
            value={stats?.activeEditions || 0}
            icon={<CalendarDaysIcon className="h-6 w-6" />}
          />
          <StatCard
            title="Iscrizioni"
            value={stats?.totalRegistrations || 0}
            icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upcoming Editions */}
          <Card>
            <CardHeader>
              <CardTitle>Prossime Edizioni</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.upcomingEditions && stats.upcomingEditions.length > 0 ? (
                <div className="space-y-4">
                  {stats.upcomingEditions.slice(0, 5).map((edition) => (
                    <div
                      key={edition.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {edition.course?.title || 'Corso'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(edition.startDate)} - {edition.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={edition.status} />
                        <p className="text-sm text-gray-500 mt-1">
                          {edition.registrationsCount || 0}/{edition.maxParticipants} iscritti
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nessuna edizione programmata
                </p>
              )}
              <div className="mt-4">
                <Link
                  to="/editions"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Vedi tutte le edizioni →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Registrations */}
          <Card>
            <CardHeader>
              <CardTitle>Iscrizioni Recenti</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentRegistrations.slice(0, 5).map((registration) => (
                    <div
                      key={registration.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {registration.student?.firstName} {registration.student?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {registration.courseEdition?.course?.title || 'Corso'}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={registration.status} />
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(registration.registrationDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nessuna iscrizione recente
                </p>
              )}
              <div className="mt-4">
                <Link
                  to="/registrations"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Vedi tutte le iscrizioni →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Link
                to="/companies"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Nuova Azienda</span>
              </Link>
              <Link
                to="/students"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <UserGroupIcon className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Nuovo Studente</span>
              </Link>
              <Link
                to="/editions"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <CalendarDaysIcon className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Nuova Edizione</span>
              </Link>
              <Link
                to="/registrations"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Nuova Iscrizione</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
