import { useEffect } from 'react';

interface ToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ type, message, onClose, duration = 5000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200'
  }[type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800'
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  }[type];

  return (
    <div className={`border rounded-lg p-4 ${bgColor}`}>
      <div className={`text-sm ${textColor} flex items-center gap-2`}>
        <span className="font-bold">{icon}</span>
        <span>{message}</span>
        <button
          onClick={onClose}
          className={`ml-auto font-bold ${textColor} hover:opacity-70`}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
