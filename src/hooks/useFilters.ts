import { useState, useEffect, useCallback } from 'react';

/**
 * Hook per gestire filtri con persistenza in localStorage
 */
export function useFilters<T extends Record<string, any>>(
  key: string,
  defaultFilters: T
): {
  filters: T;
  setFilter: <K extends keyof T>(field: K, value: T[K]) => void;
  setFilters: (newFilters: Partial<T>) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
} {
  // Carica i filtri da localStorage o usa i default
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`filters_${key}`);
      if (stored) {
        return { ...defaultFilters, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading filters from localStorage:', e);
    }
    return defaultFilters;
  });

  // Salva i filtri in localStorage quando cambiano
  useEffect(() => {
    try {
      localStorage.setItem(`filters_${key}`, JSON.stringify(filters));
    } catch (e) {
      console.error('Error saving filters to localStorage:', e);
    }
  }, [key, filters]);

  // Imposta un singolo filtro
  const setFilter = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFiltersState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Imposta più filtri contemporaneamente
  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset ai valori di default
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    try {
      localStorage.removeItem(`filters_${key}`);
    } catch (e) {
      console.error('Error removing filters from localStorage:', e);
    }
  }, [key, defaultFilters]);

  // Verifica se ci sono filtri attivi (diversi dai default)
  const hasActiveFilters = Object.keys(filters).some(
    k => filters[k] !== defaultFilters[k] && filters[k] !== '' && filters[k] !== undefined
  );

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters
  };
}

/**
 * Hook per gestire la paginazione con persistenza
 */
export function usePagination(
  key: string,
  defaultPageSize: number = 20
): {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
} {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(() => {
    try {
      const stored = localStorage.getItem(`pageSize_${key}`);
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch (e) {
      console.error('Error loading pageSize from localStorage:', e);
    }
    return defaultPageSize;
  });

  // Salva pageSize in localStorage quando cambia
  useEffect(() => {
    try {
      localStorage.setItem(`pageSize_${key}`, String(pageSize));
    } catch (e) {
      console.error('Error saving pageSize to localStorage:', e);
    }
  }, [key, pageSize]);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1); // Reset alla prima pagina quando cambia la dimensione
  }, []);

  const resetPagination = useCallback(() => {
    setPageState(1);
    setPageSizeState(defaultPageSize);
  }, [defaultPageSize]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination
  };
}

/**
 * Hook per gestire l'ordinamento con persistenza
 */
export function useSorting<T extends string>(
  key: string,
  defaultField: T,
  defaultDirection: 'asc' | 'desc' = 'asc'
): {
  sortField: T;
  sortDirection: 'asc' | 'desc';
  setSorting: (field: T, direction?: 'asc' | 'desc') => void;
  toggleSorting: (field: T) => void;
  resetSorting: () => void;
} {
  const [sortField, setSortField] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`sort_${key}`);
      if (stored) {
        const { field } = JSON.parse(stored);
        return field as T;
      }
    } catch (e) {
      console.error('Error loading sort from localStorage:', e);
    }
    return defaultField;
  });

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    try {
      const stored = localStorage.getItem(`sort_${key}`);
      if (stored) {
        const { direction } = JSON.parse(stored);
        return direction;
      }
    } catch (e) {
      console.error('Error loading sort from localStorage:', e);
    }
    return defaultDirection;
  });

  // Salva in localStorage quando cambia
  useEffect(() => {
    try {
      localStorage.setItem(`sort_${key}`, JSON.stringify({ field: sortField, direction: sortDirection }));
    } catch (e) {
      console.error('Error saving sort to localStorage:', e);
    }
  }, [key, sortField, sortDirection]);

  const setSorting = useCallback((field: T, direction?: 'asc' | 'desc') => {
    setSortField(field);
    if (direction) {
      setSortDirection(direction);
    }
  }, []);

  const toggleSorting = useCallback((field: T) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const resetSorting = useCallback(() => {
    setSortField(defaultField);
    setSortDirection(defaultDirection);
    try {
      localStorage.removeItem(`sort_${key}`);
    } catch (e) {
      console.error('Error removing sort from localStorage:', e);
    }
  }, [key, defaultField, defaultDirection]);

  return {
    sortField,
    sortDirection,
    setSorting,
    toggleSorting,
    resetSorting
  };
}
