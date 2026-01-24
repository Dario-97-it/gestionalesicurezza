/**
 * Componente per gestire i prezzi personalizzati per azienda in un'edizione
 * Permette di impostare un prezzo diverso per ogni azienda partecipante
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import toast from 'react-hot-toast';

interface CompanyPrice {
  id: number;
  companyId: number;
  companyName: string;
  customPrice: number;
  notes: string | null;
}

interface Company {
  id: number;
  name: string;
}

interface Props {
  editionId: number;
  defaultPrice: number; // Prezzo standard dell'edizione in centesimi
  companies: Company[];
  onPriceChange?: () => void;
}

export function EditionCompanyPrices({ editionId, defaultPrice, companies, onPriceChange }: Props) {
  const [prices, setPrices] = useState<CompanyPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [priceNotes, setPriceNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchPrices = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${editionId}/company-prices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPrices(data.prices || []);
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (editionId) {
      fetchPrices();
    }
  }, [editionId]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const handleAddPrice = () => {
    setSelectedCompanyId('');
    setCustomPrice(String(defaultPrice / 100));
    setPriceNotes('');
    setIsModalOpen(true);
  };

  const handleEditPrice = (price: CompanyPrice) => {
    setSelectedCompanyId(String(price.companyId));
    setCustomPrice(String(price.customPrice / 100));
    setPriceNotes(price.notes || '');
    setIsModalOpen(true);
  };

  const handleSavePrice = async () => {
    if (!selectedCompanyId || !customPrice) {
      toast.error('Seleziona un\'azienda e inserisci il prezzo');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${editionId}/company-prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: Number(selectedCompanyId),
          customPrice: Number(customPrice),
          notes: priceNotes || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nel salvataggio');
      }

      toast.success('Prezzo salvato');
      setIsModalOpen(false);
      fetchPrices();
      onPriceChange?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrice = async (companyId: number) => {
    if (!confirm('Rimuovere il prezzo personalizzato per questa azienda?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/editions/${editionId}/company-prices?companyId=${companyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Prezzo rimosso');
      fetchPrices();
      onPriceChange?.();
    } catch (error) {
      toast.error('Errore nella rimozione');
    }
  };

  // Filtra le aziende che non hanno già un prezzo personalizzato
  const availableCompanies = companies.filter(
    c => !prices.some(p => p.companyId === c.id) || 
         prices.some(p => p.companyId === Number(selectedCompanyId))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">💰 Prezzi per Azienda</h4>
          <p className="text-sm text-gray-500">
            Prezzo standard: {formatPrice(defaultPrice)}
          </p>
        </div>
        <Button size="sm" onClick={handleAddPrice}>
          + Aggiungi Prezzo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : prices.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          Nessun prezzo personalizzato. Tutte le aziende pagano il prezzo standard.
        </p>
      ) : (
        <div className="space-y-2">
          {prices.map((price) => (
            <div
              key={price.id}
              className="flex items-center justify-between bg-white p-3 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{price.companyName}</span>
                  {price.customPrice !== defaultPrice && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      price.customPrice < defaultPrice 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {price.customPrice < defaultPrice ? '↓ Sconto' : '↑ Maggiorato'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-lg font-semibold text-blue-600">
                    {formatPrice(price.customPrice)}
                  </span>
                  {price.customPrice !== defaultPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(defaultPrice)}
                    </span>
                  )}
                </div>
                {price.notes && (
                  <p className="text-sm text-gray-500 mt-1">📝 {price.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditPrice(price)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                  title="Modifica"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeletePrice(price.companyId)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Rimuovi"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal per aggiungere/modificare prezzo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Prezzo Personalizzato per Azienda"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={prices.some(p => p.companyId === Number(selectedCompanyId))}
            >
              <option value="">Seleziona un'azienda</option>
              {availableCompanies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Prezzo Personalizzato (€) *"
              type="number"
              min="0"
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder={String(defaultPrice / 100)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Prezzo standard: {formatPrice(defaultPrice)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              rows={2}
              value={priceNotes}
              onChange={(e) => setPriceNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Es: Sconto 10% accordo quadro"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSavePrice} isLoading={isSaving}>
              Salva Prezzo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
