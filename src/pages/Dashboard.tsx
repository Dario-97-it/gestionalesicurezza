import React from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Dashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-2">Benvenuto in SecurityTools</h1>
          <p className="text-blue-100">Gestionale corsi sicurezza sul lavoro D.Lgs. 81/08</p>
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
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-indigo-600 mb-2" />
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
                to="/profile"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all"
              >
                <UserGroupIcon className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Profilo</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Utili</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  📋 Gestisci aziende, studenti e corsi di formazione sulla sicurezza
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-900">
                  ✅ Registra presenze e iscrizioni ai corsi
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-900">
                  📊 Monitora le statistiche dei corsi
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supporto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>Versione:</strong> 1.0.0 Beta
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900">
                  <strong>Ambiente:</strong> Production
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Piattaforma:</strong> Cloudflare Pages
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
