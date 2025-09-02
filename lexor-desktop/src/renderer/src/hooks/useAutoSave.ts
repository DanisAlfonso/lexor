import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';

export function useAutoSave() {
  const {
    isAutoSaveEnabled,
    autoSaveInterval,
    isDocumentModified,
    currentDocument,
    isAutoSaving,
    triggerAutoSave,
  } = useAppStore();

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastModificationTimeRef = useRef<number | null>(null);

  // Set up auto-save timer
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Only set up auto-save if enabled and document exists
    if (!isAutoSaveEnabled || !currentDocument) {
      return;
    }

    // Start auto-save timer
    const startAutoSaveTimer = () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(async () => {
        // Only save if document is modified and enough time has passed since last modification
        const now = Date.now();
        const timeSinceLastModification = lastModificationTimeRef.current 
          ? now - lastModificationTimeRef.current 
          : 0;

        // Wait at least 2 seconds after last modification before auto-saving
        // This prevents saving while user is actively typing
        if (timeSinceLastModification >= 2000) {
          await triggerAutoSave();
        } else {
          // Restart timer for the remaining time
          startAutoSaveTimer();
        }
      }, autoSaveInterval * 1000);
    };

    startAutoSaveTimer();

    // Cleanup on unmount or dependency change
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [isAutoSaveEnabled, autoSaveInterval, currentDocument, triggerAutoSave]);

  // Track when document is modified to implement typing debounce
  useEffect(() => {
    if (isDocumentModified) {
      lastModificationTimeRef.current = Date.now();
    }
  }, [isDocumentModified]);

  // Return auto-save status for UI feedback
  return {
    isAutoSaveEnabled,
    isAutoSaving,
    autoSaveInterval,
  };
}