import { ReactNode } from 'react';
import { HelpIcon } from './Tooltip';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
}

export function FormField({ label, error, required = false, help, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
        {help && (
          <span className="ml-2">
            <HelpIcon content={help} />
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function Form({ children, onSubmit, className = '' }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {children}
    </form>
  );
}

interface FormGroupProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function FormGroup({ children, columns = 1 }: FormGroupProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-4',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4`}>
      {children}
    </div>
  );
}
