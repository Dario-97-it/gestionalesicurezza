import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface NotificationBannerProps {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'new-feature';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function NotificationBanner({
  id,
  title,
  message,
  type = 'info',
  dismissible = true,
  onDismiss,
}: NotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Controlla se la notifica è già stata chiusa
    const dismissed = localStorage.getItem(`notification_dismissed_${id}`);
    if (dismissed) {
      setIsVisible(false);
    }
  }, [id]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`notification_dismissed_${id}`, 'true');
    onDismiss?.();
  };

  if (!isVisible) return null;

  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    'new-feature': 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-800',
  };

  const iconStyles = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    'new-feature': 'text-purple-500',
  };

  return (
    <div className={`rounded-lg border p-4 mb-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        {type === 'new-feature' && (
          <SparklesIcon className={`h-6 w-6 flex-shrink-0 ${iconStyles[type]}`} />
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm mt-1 opacity-90">{message}</p>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Chiudi notifica"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Componente per mostrare le novità del sistema
export function SystemUpdatesNotification() {
  return (
    <NotificationBanner
      id="system-update-2026-01-23"
      title="🚀 Nuove Funzionalità Disponibili!"
      message="Abbiamo aggiunto nuovi controlli di validazione, ottimizzazioni delle performance e miglioramenti UX. Scopri tutte le novità nella guida operatore."
      type="new-feature"
    />
  );
}
