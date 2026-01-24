/**
 * Componente per selezionare più aziende per un'edizione multi-azienda
 * Permette di aggiungere/rimuovere aziende con pulsante "+"
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import toast from 'react-hot-toast';

interface AllowedCompany {
  id: number;
  companyId: number;
  companyName: string;
  vatNumber: string | null;
  email: string | null;
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
  vatNumber?: string;
  email?: string;
}

interface Props {
  editionId: number;
  editionType: 'public' | 'private' | 'multi';
  companies: Company[];
  onTypeChange?: (newType: 'public' | 'private' | 'multi') => void;
  onCompaniesChange?: () => void;
}

export function MultiCompanySelector({ 
  editionId, 
  editionType, 
  companies, 
  onTypeChange,
  onCompaniesChange 
}: Props) {
  const [allowedCompanies, setAllowedCompanies] = useState<AllowedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllowedCompanies = async () => {
    if (!editionId) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${editionId}/allowed-companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAllowedCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching allowed companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (editionId && editionType === 'multi') {
      fetchAllowedCompanies();
    }
  }, [editionId, editionType]);

  const handleAddCompany = async () => {
    if (!selectedCompanyId) {
      toast.error('Seleziona un\'azienda');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${editionId}/allowed-companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: Number(selectedCompanyId)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'aggiunta');
      }

      toast.success(`Azienda "${data.company?.name}" aggiunta`);
      setIsModalOpen(false);
      setSelectedCompanyId('');
      fetchAllowedCompanies();
      onCompaniesChange?.();
      
      // Se era la prima azienda, il tipo è cambiato a multi
      if (editionType !== 'multi') {
        onTypeChange?.('multi');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCompany = async (companyId: number, companyName: string) => {
    if (!confirm(`Rimuovere "${companyName}" dalle aziende autorizzate?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/editions/${editionId}/allowed-companies?companyId=${companyId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await response.json();
      toast.success('Azienda rimossa');
      fetchAllowedCompanies();
      onCompaniesChange?.();

      // Se non ci sono più aziende, il tipo torna a public
      if (data.remainingCompanies === 0) {
        onTypeChange?.('public');
      }
    } catch (error) {
      toast.error('Errore nella rimozione');
    }
  };

  // Filtra le aziende disponibili (non già aggiunte)
  const availableCompanies = companies.filter(
    c => !allowedCompanies.some(ac => ac.companyId === c.id)
  );

  // Filtra per ricerca
  const filteredCompanies = availableCompanies.filter(
    c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         c.vatNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Se non è multi, mostra solo il pulsante per convertire
  if (editionType !== 'multi') {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">🏢 Aziende Autorizzate</h4>
            <p className="text-sm text-gray-500">
              {editionType === 'public' 
                ? 'Edizione pubblica: aperta a tutte le aziende'
                : 'Edizione privata: riservata a una sola azienda'}
            </p>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => setIsModalOpen(true)}
          >
            Converti in Multi-azienda
          </Button>
        </div>

        {/* Modal per aggiungere la prima azienda */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Converti in Edizione Multi-azienda"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Aggiungi la prima azienda per convertire questa edizione in multi-azienda.
              Solo le aziende selezionate potranno iscrivere i propri dipendenti.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cerca Azienda
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per nome o P.IVA..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seleziona Azienda *
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                size={5}
              >
                {filteredCompanies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name} {company.vatNumber ? `(${company.vatNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleAddCompany} isLoading={isSaving}>
                Aggiungi e Converti
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Vista per edizione multi-azienda
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">🏢 Aziende Autorizzate</h4>
          <p className="text-sm text-gray-500">
            Solo queste aziende possono iscrivere dipendenti
          </p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          + Aggiungi Azienda
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : allowedCompanies.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          Nessuna azienda selezionata. L'edizione tornerà pubblica.
        </p>
      ) : (
        <div className="space-y-2">
          {allowedCompanies.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between bg-white p-3 rounded-lg border hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {company.companyName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{company.companyName}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {company.vatNumber && <span>P.IVA: {company.vatNumber}</span>}
                    {company.email && <span>📧 {company.email}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveCompany(company.companyId, company.companyName)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Rimuovi azienda"
              >
                ✕
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500 text-right">
            {allowedCompanies.length} aziend{allowedCompanies.length === 1 ? 'a' : 'e'} autorizzat{allowedCompanies.length === 1 ? 'a' : 'e'}
          </p>
        </div>
      )}

      {/* Modal per aggiungere azienda */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSearchTerm('');
          setSelectedCompanyId('');
        }}
        title="Aggiungi Azienda Autorizzata"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cerca Azienda
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per nome o P.IVA..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredCompanies.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
              {searchTerm 
                ? 'Nessuna azienda trovata con questo criterio'
                : 'Tutte le aziende sono già state aggiunte'}
            </p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seleziona Azienda *
              </label>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                {filteredCompanies.map(company => (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompanyId(String(company.id))}
                    className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-blue-50 transition-colors ${
                      selectedCompanyId === String(company.id) ? 'bg-blue-100' : ''
                    }`}
                  >
                    <p className="font-medium text-gray-900">{company.name}</p>
                    {company.vatNumber && (
                      <p className="text-sm text-gray-500">P.IVA: {company.vatNumber}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleAddCompany} 
              isLoading={isSaving}
              disabled={!selectedCompanyId}
            >
              Aggiungi Azienda
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
