import { clsx, type ClassValue } from 'clsx';

// Utility function for combining class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format date to Italian format
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format datetime to Italian format
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount / 100); // Assuming amounts are stored in cents
}

// Format number
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('it-IT').format(num);
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

// Capitalize first letter
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate Italian fiscal code
export function isValidFiscalCode(code: string): boolean {
  const fiscalCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
  return fiscalCodeRegex.test(code);
}

// Validate Italian VAT number
export function isValidVatNumber(vat: string): boolean {
  const vatRegex = /^[0-9]{11}$/;
  return vatRegex.test(vat);
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Get status color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    confirmed: 'bg-green-100 text-green-800',
    present: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    late: 'bg-yellow-100 text-yellow-800',
    trial: 'bg-purple-100 text-purple-800',
    suspended: 'bg-red-100 text-red-800',
    expired: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
    absent: 'bg-red-100 text-red-800',
    justified: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Get status label in Italian
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Attivo',
    confirmed: 'Confermato',
    present: 'Presente',
    completed: 'Completato',
    scheduled: 'Programmato',
    ongoing: 'In corso',
    pending: 'In attesa',
    late: 'In ritardo',
    trial: 'Prova',
    suspended: 'Sospeso',
    expired: 'Scaduto',
    cancelled: 'Annullato',
    absent: 'Assente',
    justified: 'Giustificato',
    admin: 'Amministratore',
    user: 'Utente',
    readonly: 'Solo lettura',
    basic: 'Base',
    pro: 'Professional',
    enterprise: 'Enterprise',
  };
  return labels[status] || status;
}
