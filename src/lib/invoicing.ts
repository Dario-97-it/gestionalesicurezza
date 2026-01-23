/**
 * Invoicing Integration
 * 
 * Struttura preparata per l'integrazione con sistemi di fatturazione esterni.
 * Supporta: Fatture in Cloud, Aruba, TeamSystem, e API generiche.
 * 
 * SETUP RICHIESTO:
 * 1. Ottenere credenziali API dal provider scelto
 * 2. Configurare variabili ambiente:
 *    - INVOICING_PROVIDER (fattureincloud, aruba, teamsystem, custom)
 *    - INVOICING_API_KEY
 *    - INVOICING_API_SECRET (se richiesto)
 *    - INVOICING_COMPANY_ID (se richiesto)
 */

export type InvoicingProvider = 'fattureincloud' | 'aruba' | 'teamsystem' | 'custom';

export interface InvoicingConfig {
  provider: InvoicingProvider;
  apiKey: string;
  apiSecret?: string;
  companyId?: string;
  baseUrl?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number; // In centesimi
  vatRate: number; // Percentuale IVA (es. 22)
  discount?: number; // Percentuale sconto
}

export interface InvoiceData {
  clientId: string;
  clientName: string;
  clientVatNumber?: string;
  clientTaxCode?: string;
  clientAddress?: string;
  clientCity?: string;
  clientPostalCode?: string;
  clientCountry?: string;
  items: InvoiceItem[];
  paymentMethod?: string;
  paymentTerms?: number; // Giorni
  notes?: string;
  internalReference?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  clientName: string;
  pdfUrl?: string;
}

/**
 * Base Invoicing Service Interface
 */
export interface InvoicingService {
  createInvoice(data: InvoiceData): Promise<Invoice>;
  getInvoice(invoiceId: string): Promise<Invoice>;
  listInvoices(filters?: { status?: string; fromDate?: string; toDate?: string }): Promise<Invoice[]>;
  sendInvoice(invoiceId: string, email: string): Promise<boolean>;
  downloadPdf(invoiceId: string): Promise<Blob>;
  markAsPaid(invoiceId: string, paymentDate: string): Promise<Invoice>;
  cancelInvoice(invoiceId: string): Promise<Invoice>;
}

/**
 * Fatture in Cloud Integration
 * 
 * API Documentation: https://api-v2.fattureincloud.it/documentation
 */
export class FattureInCloudService implements InvoicingService {
  private config: InvoicingConfig;
  private baseUrl = 'https://api-v2.fattureincloud.it';

  constructor(config: InvoicingConfig) {
    this.config = config;
  }

  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Fatture in Cloud API error');
    }

    return response.json();
  }

  async createInvoice(data: InvoiceData): Promise<Invoice> {
    const payload = {
      data: {
        type: 'invoice',
        entity: {
          name: data.clientName,
          vat_number: data.clientVatNumber,
          tax_code: data.clientTaxCode,
          address_street: data.clientAddress,
          address_city: data.clientCity,
          address_postal_code: data.clientPostalCode,
          address_country: data.clientCountry,
        },
        items_list: data.items.map(item => ({
          product_id: null,
          name: item.description,
          qty: item.quantity,
          net_price: item.unitPrice / 100,
          vat: { id: null, value: item.vatRate },
          discount: item.discount || 0,
        })),
        payment_method: { id: null, name: data.paymentMethod || 'Bonifico' },
        notes: data.notes,
      },
    };

    const result = await this.request('POST', `/c/${this.config.companyId}/issued_documents`, payload);
    return this.mapToInvoice(result.data);
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const result = await this.request('GET', `/c/${this.config.companyId}/issued_documents/${invoiceId}`);
    return this.mapToInvoice(result.data);
  }

  async listInvoices(filters?: { status?: string; fromDate?: string; toDate?: string }): Promise<Invoice[]> {
    let endpoint = `/c/${this.config.companyId}/issued_documents?type=invoice`;
    
    if (filters?.fromDate) endpoint += `&date_from=${filters.fromDate}`;
    if (filters?.toDate) endpoint += `&date_to=${filters.toDate}`;

    const result = await this.request('GET', endpoint);
    return (result.data || []).map((doc: any) => this.mapToInvoice(doc));
  }

  async sendInvoice(invoiceId: string, email: string): Promise<boolean> {
    await this.request('POST', `/c/${this.config.companyId}/issued_documents/${invoiceId}/email`, {
      data: {
        recipient_email: email,
        subject: 'Fattura',
        body: 'In allegato la fattura.',
        include_document: true,
      },
    });
    return true;
  }

  async downloadPdf(invoiceId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/c/${this.config.companyId}/issued_documents/${invoiceId}/pdf`,
      {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    return response.blob();
  }

  async markAsPaid(invoiceId: string, paymentDate: string): Promise<Invoice> {
    const result = await this.request('PUT', `/c/${this.config.companyId}/issued_documents/${invoiceId}`, {
      data: {
        is_marked: true,
        payment_date: paymentDate,
      },
    });
    return this.mapToInvoice(result.data);
  }

  async cancelInvoice(invoiceId: string): Promise<Invoice> {
    const result = await this.request('DELETE', `/c/${this.config.companyId}/issued_documents/${invoiceId}`);
    return this.mapToInvoice(result.data);
  }

  private mapToInvoice(doc: any): Invoice {
    return {
      id: doc.id.toString(),
      number: doc.number?.toString() || '',
      date: doc.date,
      dueDate: doc.payment_terms?.due_date || doc.date,
      status: doc.is_marked ? 'paid' : 'sent',
      totalAmount: Math.round((doc.amount_gross || 0) * 100),
      vatAmount: Math.round((doc.amount_vat || 0) * 100),
      netAmount: Math.round((doc.amount_net || 0) * 100),
      clientName: doc.entity?.name || '',
      pdfUrl: doc.url,
    };
  }
}

/**
 * Generic/Custom Invoicing Service
 * 
 * Per integrazioni con API personalizzate
 */
export class CustomInvoicingService implements InvoicingService {
  private config: InvoicingConfig;

  constructor(config: InvoicingConfig) {
    this.config = config;
    if (!config.baseUrl) {
      throw new Error('baseUrl is required for custom invoicing service');
    }
  }

  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error('Custom invoicing API error');
    }

    return response.json();
  }

  async createInvoice(data: InvoiceData): Promise<Invoice> {
    return this.request('POST', '/invoices', data);
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return this.request('GET', `/invoices/${invoiceId}`);
  }

  async listInvoices(filters?: { status?: string; fromDate?: string; toDate?: string }): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    
    return this.request('GET', `/invoices?${params.toString()}`);
  }

  async sendInvoice(invoiceId: string, email: string): Promise<boolean> {
    await this.request('POST', `/invoices/${invoiceId}/send`, { email });
    return true;
  }

  async downloadPdf(invoiceId: string): Promise<Blob> {
    const response = await fetch(`${this.config.baseUrl}/invoices/${invoiceId}/pdf`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
    });
    return response.blob();
  }

  async markAsPaid(invoiceId: string, paymentDate: string): Promise<Invoice> {
    return this.request('PUT', `/invoices/${invoiceId}/paid`, { paymentDate });
  }

  async cancelInvoice(invoiceId: string): Promise<Invoice> {
    return this.request('DELETE', `/invoices/${invoiceId}`);
  }
}

/**
 * Factory per creare il servizio di fatturazione appropriato
 */
export function createInvoicingService(): InvoicingService | null {
  const provider = import.meta.env.VITE_INVOICING_PROVIDER as InvoicingProvider;
  const apiKey = import.meta.env.VITE_INVOICING_API_KEY;
  const apiSecret = import.meta.env.VITE_INVOICING_API_SECRET;
  const companyId = import.meta.env.VITE_INVOICING_COMPANY_ID;
  const baseUrl = import.meta.env.VITE_INVOICING_BASE_URL;

  if (!provider || !apiKey) {
    console.warn('Invoicing integration not configured. Set VITE_INVOICING_PROVIDER and VITE_INVOICING_API_KEY.');
    return null;
  }

  const config: InvoicingConfig = {
    provider,
    apiKey,
    apiSecret,
    companyId,
    baseUrl,
  };

  switch (provider) {
    case 'fattureincloud':
      return new FattureInCloudService(config);
    case 'custom':
      return new CustomInvoicingService(config);
    default:
      console.warn(`Invoicing provider '${provider}' not supported yet.`);
      return null;
  }
}

/**
 * Converte iscrizione corso in item fattura
 */
export function registrationToInvoiceItem(
  courseName: string,
  price: number, // In centesimi
  vatRate: number = 22
): InvoiceItem {
  return {
    description: `Corso di formazione: ${courseName}`,
    quantity: 1,
    unitPrice: price,
    vatRate,
  };
}

/**
 * Calcola totali fattura
 */
export function calculateInvoiceTotals(items: InvoiceItem[]): {
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
} {
  let netAmount = 0;
  let vatAmount = 0;

  for (const item of items) {
    const itemNet = item.quantity * item.unitPrice;
    const discount = item.discount ? (itemNet * item.discount) / 100 : 0;
    const itemNetAfterDiscount = itemNet - discount;
    const itemVat = (itemNetAfterDiscount * item.vatRate) / 100;

    netAmount += itemNetAfterDiscount;
    vatAmount += itemVat;
  }

  return {
    netAmount: Math.round(netAmount),
    vatAmount: Math.round(vatAmount),
    totalAmount: Math.round(netAmount + vatAmount),
  };
}

export default createInvoicingService;
