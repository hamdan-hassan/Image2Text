import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { ScanRecord } from '../types/scan';
import { getScansRepository } from '../services/database/repositoryProvider';
import { onScansChanged } from '../services/database/scanEvents';

/**
 * Loads scans (optionally filtered by the offline search index) and keeps them
 * fresh via the repository change bus plus screen-focus refreshes.
 */
export function useScans(query?: string) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const repository = await getScansRepository();
      const trimmed = query?.trim();
      const results = trimmed ? await repository.search(trimmed) : await repository.list();
      setScans(results);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
    return onScansChanged(() => {
      void refresh();
    });
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { scans, loading, failed, refresh };
}
