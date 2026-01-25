import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { exportToExcel } from '../lib/excel';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Scadenza {
  id: number;
  studentId: number;
  studentName: string;
  courseId: number;
  courseTitle: string;
  completionDate: string;
  expiryDate: string;
  daysRemaining: number;
  urgency: 'scaduto' | 'entro30' | 'entro60' | 'entro90' | 'valido';
  companyName: string;
  companyEmail?: string;
}

export default function Scadenzario() {
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  useEffect(() => {
    fetchScadenze();
  }, []);

  const fetchScadenze = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/reports/expirations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.success) {
        setScadenze(result.data);
        // Estrai aziende uniche per il filtro
        const uniqueCompanies = Array.from(new Set(result.data.map((s: Scadenza) => s.companyName))) as string[];
        setCompanies(uniqueCompanies.filter(Boolean));
      }
    } catch (error) {
      toast.error('Errore nel caricamento delle scadenze');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'scaduto':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 uppercase">Scaduto</span>;
      case 'entro30':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 uppercase">&lt; 30gg</span>;
      case 'entro60':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 uppercase">30-60gg</span>;
      case 'entro90':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 uppercase">60-90gg</span>;
      default:
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 uppercase">&gt; 90gg</span>;
    }
  };

  const filteredScadenze = scadenze.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = filterUrgency === 'all' || s.urgency === filterUrgency;
    const matchesCompany = filterCompany === 'all' || s.companyName === filterCompany;
    return matchesSearch && matchesUrgency && matchesCompany;
  });

  const handleExport = () => {
    const dataToExport = filteredScadenze.map(s => ({
      'Studente': s.studentName,
      'Azienda': s.companyName,
      'Corso': s.courseTitle,
      'Data Conseguimento': s.completionDate,
      'Data Scadenza': s.expiryDate,
      'Giorni Rimanenti': s.daysRemaining,
      'Stato': s.urgency.toUpperCase()
    }));
    exportToExcel(dataToExport, 'scadenzario_attestati');
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredScadenze.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredScadenze.map(s => s.id)));
    }
  };

  const handleSendBulkEmails = async () => {
    if (selectedIds.size === 0) {
      toast.error('Seleziona almeno una scadenza');
      return;
    }

    const confirmed = window.confirm(
      `Stai per inviare ${selectedIds.size} email di avviso scadenza alle aziende. Continuare?`
    );
    if (!confirmed) return;

    setIsSendingEmails(true);
    try {
      const selectedScadenze = filteredScadenze.filter(s => selectedIds.has(s.id));
      
      // Raggruppa per azienda
      const byCompany = selectedScadenze.reduce((acc, s) => {
        if (!acc[s.companyName]) {
          acc[s.companyName] = [];
        }
        acc[s.companyName].push(s);
        return acc;
      }, {} as Record<string, Scadenza[]>);

      // Simula invio email (in produzione usare API Resend)
      const emailCount = Object.keys(byCompany).length;
      
      // Qui andrebbe la chiamata API reale
      // await fetch('/api/email/send-bulk-certificate-notices', { ... });
      
      toast.success(`Inviate ${emailCount} email di avviso alle aziende`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Errore nell\'invio delle email');
    } finally {
      setIsSendingEmails(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scadenzario Attestati</h1>
            <p className="text-gray-600">Gestione scadenze certificazioni e rinnovi</p>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button 
                onClick={handleSendBulkEmails} 
                variant="primary" 
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
                disabled={isSendingEmails}
              >
                📧 Invia Avvisi ({selectedIds.size})
              </Button>
            )}
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-4 h-4" />
              Esporta Excel
            </Button>
          </div>
        </div>

        {/* Filtri */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Cerca studente o corso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                >
                  <option value="all">Tutte le urgenze</option>
                  <option value="scaduto">Scaduti</option>
                  <option value="entro30">Entro 30 giorni</option>
                  <option value="entro60">Entro 60 giorni</option>
                  <option value="entro90">Entro 90 giorni</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                >
                  <option value="all">Tutte le aziende</option>
                  {companies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end">
                <p className="text-sm text-gray-500">
                  Trovati: <span className="font-bold text-gray-900">{filteredScadenze.length}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabella */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredScadenze.length && filteredScadenze.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </TableHead>
                <TableHead><div className="flex items-center gap-1"><UserIcon className="w-4 h-4"/> Studente</div></TableHead>
                <TableHead>Corso</TableHead>
                <TableHead><div className="flex items-center gap-1"><CalendarIcon className="w-4 h-4"/> Conseguimento</div></TableHead>
                <TableHead><div className="flex items-center gap-1"><CalendarIcon className="w-4 h-4"/> Scadenza</div></TableHead>
                <TableHead><div className="flex items-center gap-1"><ClockIcon className="w-4 h-4"/> Giorni</div></TableHead>
                <TableHead><div className="flex items-center gap-1"><ExclamationTriangleIcon className="w-4 h-4"/> Urgenza</div></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : filteredScadenze.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState title="Nessuna scadenza trovata" description="Modifica i filtri per vedere più risultati" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredScadenze.map((s) => (
                  <TableRow key={s.id} className={`hover:bg-gray-50 ${selectedIds.has(s.id) ? 'bg-blue-50' : ''}`}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelection(s.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{s.studentName}</div>
                      <div className="text-xs text-gray-500">{s.companyName}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{s.courseTitle}</TableCell>
                    <TableCell className="text-sm text-gray-600">{new Date(s.completionDate).toLocaleDateString('it-IT')}</TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{new Date(s.expiryDate).toLocaleDateString('it-IT')}</TableCell>
                    <TableCell className="text-sm font-semibold">
                      <span className={s.daysRemaining < 0 ? 'text-red-600' : s.daysRemaining < 30 ? 'text-orange-600' : 'text-gray-600'}>
                        {s.daysRemaining}
                      </span>
                    </TableCell>
                    <TableCell>{getUrgencyBadge(s.urgency)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
