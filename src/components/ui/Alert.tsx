import { ReactNode } from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string | ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
}

export function Alert({ type, title, message, onClose, dismissible = true }: AlertProps) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✓',
      iconColor: 'text-green-600',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '✕',
      iconColor: 'text-red-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠',
      iconColor: 'text-yellow-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ',
      iconColor: 'text-blue-600',
    },
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 ${style.text}`}>
      <div className="flex items-start gap-3">
        <span className={`text-xl font-bold ${style.iconColor} flex-shrink-0`}>
          {style.icon}
        </span>
        <div className="flex-1">
          {title && <h3 className="font-semibold mb-1">{title}</h3>}
          <div className="text-sm">{message}</div>
        </div>
        {dismissible && onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 font-bold ${style.text} hover:opacity-70`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
