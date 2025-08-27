import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StudySettings } from '../../../shared/types/flashcards';

interface StudySettingsState extends StudySettings {
  // Actions
  updateSettings: (settings: Partial<StudySettings>) => void;
  resetToDefaults: () => void;
  getEffectiveLimit: (type: 'new' | 'review', isCollection: boolean) => number;
}

// Default settings - reasonable for most users
const defaultSettings: StudySettings = {
  // Daily limits - Anki-inspired defaults
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
  
  // Session settings
  learnAheadTimeMinutes: 20, // Learn ahead up to 20 minutes
  timezoneOffset: new Date().getTimezoneOffset(), // Auto-detect
  
  // FSRS settings
  desiredRetention: 0.9, // 90% retention
  maximumInterval: 36500, // ~100 years
  learningSteps: [10, 30], // 10 minutes, then 30 minutes (more reasonable default)
  relearningSteps: [15], // 15 minutes for relearning
  
  // Display preferences
  showAnswerTimer: false,
  showProgress: true,
  
  // Study behavior
  buryRelatedCards: false,
  autoAdvance: false
};

export const useStudySettingsStore = create<StudySettingsState>()(
  persist(
    (set, get) => ({
      // Initialize with defaults
      ...defaultSettings,

      // Update specific settings
      updateSettings: (updates: Partial<StudySettings>) => {
        set((state) => ({
          ...state,
          ...updates
        }));
        
        // If FSRS-related settings changed, update the service
        const fsrsSettings = ['desiredRetention', 'maximumInterval', 'learningSteps', 'relearningSteps'];
        const hasFSRSChanges = Object.keys(updates).some(key => fsrsSettings.includes(key));
        
        if (hasFSRSChanges) {
          // Trigger FSRS update in flashcard service
          // Note: This will be picked up automatically next time the service is used
        }
      },

      // Reset all settings to defaults
      resetToDefaults: () => {
        set(defaultSettings);
      },

      // Get effective limit based on user settings and context
      getEffectiveLimit: (type: 'new' | 'review', isCollection: boolean = false) => {
        const state = get();
        
        if (type === 'new') {
          // For new cards, always respect user's daily limit
          return state.newCardsPerDay;
        } else {
          // For review cards, respect max reviews but allow some flexibility for collections
          const baseLimit = state.maxReviewsPerDay;
          
          // For collections, allow a bit more to handle multiple decks
          return isCollection ? Math.min(baseLimit * 1.5, baseLimit + 50) : baseLimit;
        }
      }
    }),
    {
      name: 'lexor-study-settings', // localStorage key
      version: 1,
      // Only persist the settings, not the actions
      partialize: (state) => {
        const { updateSettings, resetToDefaults, getEffectiveLimit, ...settings } = state;
        return settings as StudySettings;
      }
    }
  )
);