import { useEffect, useState } from 'react';

/** React state mirrored to localStorage (settings and estimates are small JSON). */
export function usePersistentState<T>(key: string, initial: () => T, migrate?: (stored: T) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        return migrate ? migrate(parsed) : parsed;
      }
    } catch {
      /* fall through to initial */
    }
    return initial();
  });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError(null);
    } catch (e) {
      setError(`Could not save to this browser: ${(e as Error).message}`);
    }
  }, [key, value]);
  return [value, setValue, error] as const;
}

/*
 * Report images can be several MB, which would blow the ~5 MB localStorage quota,
 * so they live in IndexedDB keyed by estimate id.
 */
const DB_NAME = 'shingle-estimator';
const STORE = 'reports';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredReport {
  name: string;
  /** One image per report page (PDFs are rasterised). */
  pages: string[];
}

export const getReport = (id: string) => tx<StoredReport | undefined>('readonly', (s) => s.get(id));
export const putReport = (id: string, r: StoredReport) => tx('readwrite', (s) => s.put(r, id));
export const deleteReport = (id: string) => tx('readwrite', (s) => s.delete(id));
