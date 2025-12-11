import { useState, useEffect, useCallback } from 'react';

interface FormDraftOptions<T> {
  key: string;
  defaultValues?: T;
  autoSaveDelay?: number;
}

export function useFormDraft<T extends Record<string, any>>({
  key,
  defaultValues,
  autoSaveDelay = 1000
}: FormDraftOptions<T>) {
  const storageKey = `form_draft_${key}`;
  const [values, setValues] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultValues, ...parsed.data } as T;
      }
    } catch (error) {
      console.error('Failed to load form draft:', error);
    }
    return (defaultValues || {}) as T;
  });

  const [hasDraft, setHasDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return !!saved;
    } catch {
      return false;
    }
  });

  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const saveDraft = useCallback((data: T) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      setHasDraft(true);
    } catch (error) {
      console.error('Failed to save form draft:', error);
    }
  }, [storageKey]);

  const updateValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => {
      const updated = { ...prev, ...newValues };

      if (saveTimer) {
        clearTimeout(saveTimer);
      }

      const timer = setTimeout(() => {
        saveDraft(updated);
      }, autoSaveDelay);

      setSaveTimer(timer);

      return updated;
    });
  }, [saveDraft, autoSaveDelay, saveTimer]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    } catch (error) {
      console.error('Failed to clear form draft:', error);
    }
  }, [storageKey, saveTimer]);

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setValues({ ...defaultValues, ...parsed.data } as T);
        return true;
      }
    } catch (error) {
      console.error('Failed to restore form draft:', error);
    }
    return false;
  }, [storageKey, defaultValues]);

  const getDraftAge = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Date.now() - parsed.timestamp;
      }
    } catch (error) {
      console.error('Failed to get draft age:', error);
    }
    return null;
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  return {
    values,
    updateValues,
    saveDraft: () => saveDraft(values),
    clearDraft,
    restoreDraft,
    hasDraft,
    getDraftAge,
    setValues
  };
}
