import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  Deck, 
  Flashcard, 
  StudyCard, 
  StudySession, 
  DeckStats, 
  Rating,
  FlashcardViewState 
} from '../../../shared/types/flashcards';
import { FlashcardService } from '../services/flashcardService';
import { useAppStore } from './appStore';

export interface FlashcardState {
  // Service instance
  service: FlashcardService;
  
  // Data
  decks: Deck[];
  currentDeck: Deck | null;
  currentCards: Flashcard[];
  
  // Study session
  currentSession: StudySession | null;
  currentCard: StudyCard | null;
  showAnswer: boolean;
  studyStats: DeckStats | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  viewState: FlashcardViewState;
  
  // Actions - Deck management
  loadDecks: () => Promise<void>;
  createDeck: (name: string, description?: string, filePath?: string) => Promise<boolean>;
  selectDeck: (deckId: number) => Promise<void>;
  updateDeck: (deckId: number, updates: Partial<Deck>) => Promise<boolean>;
  deleteDeck: (deckId: number) => Promise<boolean>;
  
  // Actions - Flashcard management
  loadCards: (deckId: number) => Promise<void>;
  createCard: (card: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateCard: (cardId: number, updates: Partial<Flashcard>) => Promise<boolean>;
  deleteCard: (cardId: number) => Promise<boolean>;
  
  // Actions - Import/Export
  importFromMarkdown: (filePath: string, content: string, deckName?: string) => Promise<boolean>;
  importFromCurrentFile: () => Promise<boolean>;
  
  // Actions - Study session
  startStudySession: (deckId?: number, studyMode?: 'new' | 'due' | 'all', includeChildren?: boolean) => Promise<void>;
  endStudySession: () => void;
  showCardAnswer: () => void;
  reviewCurrentCard: (rating: Rating) => Promise<void>;
  nextCard: () => void;
  previousCard: () => void;
  
  // Actions - Statistics
  loadDeckStats: (deckId: number) => Promise<void>;
  loadAllStats: () => Promise<void>;
  getComprehensiveStats: () => Promise<any>;
  getDeckDetailedStats: (deckId: number) => Promise<any>;
  
  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Maintenance actions
  removeDuplicateCards: () => Promise<{ removed: number, errors: string[] }>;
  resetFlashcardDatabase: () => Promise<boolean>;
  
  // Auto-discovery actions
  discoverAndSyncLibrary: (libraryPath?: string) => Promise<{ success: boolean, filesProcessed: number, decksCreated: number, cardsImported: number, orphanedDecks: Array<{id: number, name: string, filePath: string}>, errors: string[] }>;
  removeOrphanedDecks: (orphanedIds: number[]) => Promise<{ success: boolean, removed: number, errors: string[] }>;
}

export const useFlashcardStore = create<FlashcardState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    service: new FlashcardService(),
    decks: [],
    currentDeck: null,
    currentCards: [],
    currentSession: null,
    currentCard: null,
    showAnswer: false,
    studyStats: null,
    isLoading: false,
    error: null,
    viewState: {
      isStudying: false,
      showAnswer: false,
      studyMode: 'due'
    },

    // Deck management actions
    loadDecks: async () => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const decks = await service.getAllDecks();
        set({ decks, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load decks',
          isLoading: false 
        });
      }
    },

    createDeck: async (name: string, description?: string, filePath?: string) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const result = await service.createDeck(name, description, filePath);
        if (result.success) {
          // Reload decks to show the new one
          await get().loadDecks();
          return true;
        } else {
          set({ error: result.error || 'Failed to create deck', isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create deck',
          isLoading: false 
        });
        return false;
      }
    },

    selectDeck: async (deckId: number) => {
      const { service, decks } = get();
      set({ isLoading: true, error: null });
      
      try {
        const deck = decks.find(d => d.id === deckId);
        if (!deck) {
          throw new Error('Deck not found');
        }
        
        set({ currentDeck: deck });
        await get().loadCards(deckId);
        await get().loadDeckStats(deckId);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to select deck',
          isLoading: false 
        });
      }
    },

    updateDeck: async (deckId: number, updates: Partial<Deck>) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const success = await service.updateDeck(deckId, updates);
        if (success) {
          await get().loadDecks();
          return true;
        } else {
          set({ error: 'Failed to update deck', isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update deck',
          isLoading: false 
        });
        return false;
      }
    },

    deleteDeck: async (deckId: number) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const success = await service.deleteDeck(deckId);
        if (success) {
          await get().loadDecks();
          // Clear current deck if it was deleted
          const { currentDeck } = get();
          if (currentDeck && currentDeck.id === deckId) {
            set({ currentDeck: null, currentCards: [], studyStats: null });
          }
          return true;
        } else {
          set({ error: 'Failed to delete deck', isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete deck',
          isLoading: false 
        });
        return false;
      }
    },

    // Flashcard management actions
    loadCards: async (deckId: number) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const cards = await service.getFlashcardsByDeck(deckId);
        set({ currentCards: cards, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load cards',
          isLoading: false 
        });
      }
    },

    createCard: async (card: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const cardId = await service.createFlashcard(card);
        if (cardId) {
          // Reload cards and stats
          await get().loadCards(card.deck_id);
          if (get().studyStats) {
            await get().loadDeckStats(card.deck_id);
          }
          return true;
        } else {
          set({ error: 'Failed to create card', isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create card',
          isLoading: false 
        });
        return false;
      }
    },

    updateCard: async (cardId: number, updates: Partial<Flashcard>) => {
      const { service, currentDeck } = get();
      set({ isLoading: true, error: null });
      
      try {
        const success = await service.updateFlashcard(cardId, updates);
        if (success && currentDeck) {
          await get().loadCards(currentDeck.id!);
          return true;
        } else {
          set({ error: 'Failed to update card', isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update card',
          isLoading: false 
        });
        return false;
      }
    },

    deleteCard: async (cardId: number) => {
      const { service, currentDeck } = get();
      set({ isLoading: true, error: null });
      
      try {
        const success = await service.deleteFlashcard(cardId);
        if (success && currentDeck) {
          await get().loadCards(currentDeck.id!);
          await get().loadDeckStats(currentDeck.id!);
          return true;
        } else {
          set({ error: 'Failed to delete card', isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete card',
          isLoading: false 
        });
        return false;
      }
    },

    // Import/Export actions
    importFromMarkdown: async (filePath: string, content: string, deckName?: string) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const result = await service.importFromMarkdown(filePath, content, deckName);
        if (result.success) {
          await get().loadDecks();
          if (result.deck_id) {
            await get().selectDeck(result.deck_id);
          }
          
          // Handle different import scenarios elegantly
          if (result.errors && result.errors.length > 0) {
            const skipMessage = result.errors.find(e => e.includes('skipped'));
            if (skipMessage && result.imported_count === 0) {
              // All cards were skipped - this is normal, don't show as error
              console.log('All flashcards are already up to date - no changes needed');
              set({ isLoading: false });
              return true;
            } else if (skipMessage) {
              // Some imported, some skipped - show info
              console.log(`Import completed: ${result.imported_count} new cards imported`);
            }
          } else if (result.imported_count > 0) {
            console.log(`Successfully imported ${result.imported_count} new flashcards`);
          }
          
          set({ isLoading: false });
          return true;
        } else {
          const errorMsg = result.errors ? result.errors.join(', ') : 'Failed to import';
          set({ error: errorMsg, isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to import from markdown',
          isLoading: false 
        });
        return false;
      }
    },

    importFromCurrentFile: async () => {
      try {
        // Get current document from the app store
        const { currentDocument, documentContent } = useAppStore.getState();
        
        if (!currentDocument || !documentContent) {
          set({ error: 'No document is currently open' });
          return false;
        }
        
        return await get().importFromMarkdown(
          currentDocument, 
          documentContent
        );
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to import from current file'
        });
        return false;
      }
    },

    // Study session actions
    startStudySession: async (deckId?: number, studyMode: 'new' | 'due' | 'all' = 'due', includeChildren: boolean = false) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        let cards: StudyCard[] = [];
        
        // Set appropriate limits based on whether we're studying a collection
        const newCardLimit = includeChildren ? 50 : 20; // Higher limit for collections
        
        switch (studyMode) {
          case 'new':
            cards = await service.getNewCards(deckId, newCardLimit, includeChildren);
            break;
          case 'due':
            cards = await service.getDueCards(deckId, undefined, includeChildren);
            break;
          case 'all':
            const dueCards = await service.getDueCards(deckId, undefined, includeChildren);
            const newCards = await service.getNewCards(deckId, newCardLimit, includeChildren);
            cards = [...dueCards, ...newCards];
            break;
        }
        
        if (cards.length === 0) {
          set({ 
            error: studyMode === 'new' ? 'No new cards to study' : 'No cards due for review',
            isLoading: false 
          });
          return;
        }
        
        const session: StudySession = {
          deck_id: deckId,
          cards,
          current_index: 0,
          session_start: new Date(),
          cards_reviewed: 0,
          total_cards: cards.length
        };
        
        set({
          currentSession: session,
          currentCard: cards[0],
          showAnswer: false,
          isLoading: false,
          viewState: { ...get().viewState, isStudying: true, studyMode }
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to start study session',
          isLoading: false 
        });
      }
    },

    endStudySession: () => {
      set({
        currentSession: null,
        currentCard: null,
        showAnswer: false,
        viewState: { ...get().viewState, isStudying: false }
      });
    },

    showCardAnswer: () => {
      const { showAnswer } = get();
      set({ showAnswer: !showAnswer });
    },

    reviewCurrentCard: async (rating: Rating) => {
      const { service, currentCard, currentSession } = get();
      if (!currentCard || !currentSession) return;
      
      try {
        await service.reviewCard(currentCard.id, rating);
        
        // Update session stats
        const updatedSession = {
          ...currentSession,
          cards_reviewed: currentSession.cards_reviewed + 1
        };
        
        set({ currentSession: updatedSession });
        
        // Move to next card
        get().nextCard();
        
        // Update stats if we have a current deck
        const { currentDeck } = get();
        if (currentDeck) {
          await get().loadDeckStats(currentDeck.id!);
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to review card'
        });
      }
    },

    nextCard: () => {
      const { currentSession } = get();
      if (!currentSession) return;
      
      const nextIndex = currentSession.current_index + 1;
      if (nextIndex < currentSession.cards.length) {
        const nextCard = currentSession.cards[nextIndex];
        set({
          currentSession: { ...currentSession, current_index: nextIndex },
          currentCard: nextCard,
          showAnswer: false
        });
      } else {
        // End of session
        get().endStudySession();
      }
    },

    previousCard: () => {
      const { currentSession } = get();
      if (!currentSession || currentSession.current_index <= 0) return;
      
      const prevIndex = currentSession.current_index - 1;
      const prevCard = currentSession.cards[prevIndex];
      set({
        currentSession: { ...currentSession, current_index: prevIndex },
        currentCard: prevCard,
        showAnswer: false
      });
    },

    // Statistics actions
    loadDeckStats: async (deckId: number) => {
      const { service } = get();
      try {
        const stats = await service.getDeckStats(deckId);
        set({ studyStats: stats });
      } catch (error) {
        console.error('Failed to load deck stats:', error);
      }
    },

    loadAllStats: async () => {
      const { service } = get();
      try {
        const stats = await service.getAllStats();
        set({ studyStats: stats });
      } catch (error) {
        console.error('Failed to load all stats:', error);
      }
    },

    getComprehensiveStats: async () => {
      const { service } = get();
      try {
        return await service.getComprehensiveStats();
      } catch (error) {
        console.error('Failed to load comprehensive stats:', error);
        return null;
      }
    },

    getDeckDetailedStats: async (deckId: number) => {
      const { service } = get();
      try {
        return await service.getDeckDetailedStats(deckId);
      } catch (error) {
        console.error('Failed to load deck detailed stats:', error);
        return null;
      }
    },

    // Utility actions
    clearError: () => set({ error: null }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    
    // Maintenance actions
    removeDuplicateCards: async () => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const result = await service.removeDuplicateCards();
        if (result.errors.length > 0) {
          set({ error: result.errors.join(', '), isLoading: false });
        } else {
          // Reload decks after cleanup
          await get().loadDecks();
          set({ isLoading: false });
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove duplicates';
        set({ error: errorMessage, isLoading: false });
        return { removed: 0, errors: [errorMessage] };
      }
    },

    resetFlashcardDatabase: async () => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const result = await service.resetAndReimportFromDirectory('');
        if (result.success) {
          await get().loadDecks();
          set({ isLoading: false });
          return true;
        } else {
          set({ error: result.message, isLoading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to reset database',
          isLoading: false 
        });
        return false;
      }
    },

    discoverAndSyncLibrary: async (libraryPath?: string) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const defaultLibraryPath = '/Users/danny/Documents/Lexor Library';
        const result = await service.discoverAndSyncLibrary(libraryPath || defaultLibraryPath);
        
        // Reload decks to show new discoveries
        await get().loadDecks();
        
        if (result.errors.length > 0) {
          console.warn('Discovery completed with errors:', result.errors);
        }
        
        set({ isLoading: false });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to discover library';
        set({ error: errorMessage, isLoading: false });
        return {
          success: false,
          filesProcessed: 0,
          decksCreated: 0,
          cardsImported: 0,
          orphanedDecks: [],
          errors: [errorMessage]
        };
      }
    },

    removeOrphanedDecks: async (orphanedIds: number[]) => {
      const { service } = get();
      set({ isLoading: true, error: null });
      
      try {
        const result = await service.removeOrphanedDecks(orphanedIds);
        
        // Reload decks to reflect changes
        await get().loadDecks();
        
        set({ isLoading: false });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove orphaned decks';
        set({ error: errorMessage, isLoading: false });
        return {
          success: false,
          removed: 0,
          errors: [errorMessage]
        };
      }
    }
  }))
);