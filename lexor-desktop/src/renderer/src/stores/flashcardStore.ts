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
import { useStudySettingsStore } from './studySettingsStore';

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
  completionMessage: string | null;
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
  clearCompletionMessage: () => void;
  setCompletionMessage: (message: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Maintenance actions
  removeDuplicateCards: () => Promise<{ removed: number, errors: string[] }>;
  resetFlashcardDatabase: () => Promise<boolean>;
  
  // Auto-discovery actions
  discoverAndSyncLibrary: (libraryPath?: string) => Promise<{ success: boolean, filesProcessed: number, decksCreated: number, cardsImported: number, orphanedDecks: Array<{id: number, name: string, filePath: string}>, errors: string[] }>;
  removeOrphanedDecks: (orphanedIds: number[]) => Promise<{ success: boolean, removed: number, errors: string[] }>;
  
  // Internal method for session management
  checkForMoreCards: () => Promise<void>;
  
  // Anki-style queue management
  reorderSessionQueue: () => void;
  insertCardAtCorrectPosition: (card: StudyCard) => void;
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
    completionMessage: null,
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
        
        // Get user-defined limits from settings
        const studySettings = useStudySettingsStore.getState();
        const newCardLimit = studySettings.getEffectiveLimit('new', includeChildren);
        const dueCardLimit = studySettings.getEffectiveLimit('review', includeChildren);
        
        
        switch (studyMode) {
          case 'new':
            cards = await service.getNewCards(deckId, newCardLimit, includeChildren);
            break;
          case 'due':
            cards = await service.getDueCards(deckId, dueCardLimit, includeChildren);
            break;
          case 'all':
            const dueCards = await service.getDueCards(deckId, dueCardLimit, includeChildren);
            const newCards = await service.getNewCards(deckId, newCardLimit, includeChildren);
            cards = [...dueCards, ...newCards];
            break;
        }
        
        
        if (cards.length === 0) {
          // Use completion message instead of error - this is a positive outcome!
          const completionMessage = studyMode === 'new' 
            ? '🎉 All caught up! No new cards to learn today. Great job staying on top of your studies!' 
            : '✨ Excellent work! You\'ve completed all your reviews for now. Check back later for more cards to study.';
            
          set({ 
            completionMessage,
            isLoading: false,
            error: null // Make sure error is cleared
          });
          return;
        }
        
        // Sort cards by due time initially (Anki-style) - due cards first, then by time
        const now = new Date();
        const sortedCards = cards.sort((a, b) => {
          const aTime = new Date(a.due).getTime();
          const bTime = new Date(b.due).getTime();
          
          // Due cards first (past or very recent), then future cards
          const aDue = aTime <= now.getTime();
          const bDue = bTime <= now.getTime();
          
          if (aDue && !bDue) return -1; // a is due, b is not
          if (!aDue && bDue) return 1;  // b is due, a is not
          
          // Both due or both future - sort by time
          return aTime - bTime;
        });
        

        const session: StudySession = {
          deck_id: deckId,
          cards: sortedCards, // Use sorted cards
          current_index: 0,
          session_start: new Date(),
          cards_reviewed: 0,
          total_cards: sortedCards.length
        };
        
        set({
          currentSession: session,
          currentCard: sortedCards[0],
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
        
        // Handle failed cards (Again rating) - re-queue them if due soon
        if (rating === Rating.Again) {
          // Get the updated card state to check its new due date
          const updatedCardState = await service.getCardState(currentCard.id);
          
          if (updatedCardState) {
            const now = new Date();
            const timeDifference = updatedCardState.due.getTime() - now.getTime();
            const minutesUntilDue = timeDifference / (1000 * 60);
            
            
            // Use user's learn-ahead setting but also enforce minimum spacing
            const studySettings = useStudySettingsStore.getState();
            const learnAheadMinutes = studySettings.learnAheadTimeMinutes;
            
            // Only re-queue if:
            // 1. Card is within learn-ahead window AND
            // 2. Card is due at least 30 seconds from now (prevent immediate reappearance)
            if (minutesUntilDue <= learnAheadMinutes && minutesUntilDue >= 0.5) {
              const reQueuedCard: StudyCard = {
                ...currentCard,
                due: updatedCardState.due,
                stability: updatedCardState.stability,
                difficulty: updatedCardState.difficulty,
                state: updatedCardState.state,
                lapses: updatedCardState.lapses,
                reps: updatedCardState.reps
              };
              
              // Set the updated session first (for stats)
              set({ currentSession: updatedSession });
              
              // Use Anki-style insertion at correct time-based position
              get().insertCardAtCorrectPosition(reQueuedCard);
              
            }
          }
        }
        
        // Periodically reorder the queue to respect time-based due dates (Anki behavior)
        // This ensures cards due sooner appear first, even if other cards were added later
        if (get().currentSession && get().currentSession!.cards_reviewed % 5 === 0) {
          get().reorderSessionQueue();
        }
        
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
        // No more cards in current session - check if we should fetch more or end
        get().checkForMoreCards();
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
    clearCompletionMessage: () => set({ completionMessage: null }),
    setCompletionMessage: (message: string) => set({ completionMessage: message, error: null }), // Clear error when showing completion
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
    },

    // Check if there are more cards to study or end the session
    checkForMoreCards: async () => {
      const { service, currentSession } = get();
      if (!currentSession) return;
      
      
      try {
        set({ isLoading: true });
        
        // Check if there are more cards due now from the same deck/collection
        let newDueCards: StudyCard[] = [];
        const includeChildren = currentSession.deck_id ? 
          // If we have a deck_id, check if it's a collection (no file_path)
          (await service.getDeck(currentSession.deck_id))?.file_path === null || false
          : false;
        
        
        // Get currently due cards (not including new cards, just reviewing)
        // Use a smaller batch size for mid-session card loading
        const batchSize = 10; // Smaller batches during session continuation
        newDueCards = await service.getDueCards(currentSession.deck_id, batchSize, includeChildren);
        
        // Filter out cards that are already in the current session to avoid duplicates
        const existingCardIds = new Set(currentSession.cards.map(card => card.id));
        const freshDueCards = newDueCards.filter(card => !existingCardIds.has(card.id));
        
        
        if (freshDueCards.length > 0) {
          // Add new due cards to the session
          const updatedSession = {
            ...currentSession,
            cards: [...currentSession.cards, ...freshDueCards],
            total_cards: currentSession.total_cards + freshDueCards.length
          };
          
          
          set({ 
            currentSession: updatedSession,
            isLoading: false 
          });
          
          // Continue with the next card
          get().nextCard();
        } else {
          // No more cards available - end the session with a positive message
          console.log('🏁 No more cards available. Ending study session.');
          const cardsReviewed = currentSession.cards_reviewed;
          const completionMessage = cardsReviewed > 0 
            ? `🎊 Study session complete! You reviewed ${cardsReviewed} card${cardsReviewed === 1 ? '' : 's'}. Well done!`
            : '✨ All caught up! No cards need reviewing right now.';
            
          set({ 
            completionMessage,
            isLoading: false,
            error: null
          });
          get().endStudySession();
        }
      } catch (error) {
        console.error('Failed to check for more cards:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load more cards',
          isLoading: false 
        });
        
        // On error, end the session
        get().endStudySession();
      }
    },

    // Anki-style dynamic queue management
    reorderSessionQueue: () => {
      const { currentSession } = get();
      if (!currentSession) return;

      
      // Get current time for comparison
      const now = new Date();
      
      // Separate cards that are due now vs later
      const dueNow: StudyCard[] = [];
      const dueLater: StudyCard[] = [];
      
      // Start from current position to preserve cards already shown
      const remainingCards = currentSession.cards.slice(currentSession.current_index + 1);
      
      remainingCards.forEach(card => {
        const cardDueTime = new Date(card.due);
        const minutesUntilDue = (cardDueTime.getTime() - now.getTime()) / (1000 * 60);
        
        // Cards due within learn-ahead window (default 20 minutes) go to immediate queue
        const studySettings = useStudySettingsStore.getState();
        const learnAheadMinutes = studySettings.learnAheadTimeMinutes;
        
        if (minutesUntilDue <= learnAheadMinutes) {
          dueNow.push(card);
        } else {
          dueLater.push(card);
        }
      });

      // Sort due-now cards with Anki priorities:
      // 1. Learning cards (state 1,3) come first - they're being actively learned
      // 2. Review cards (state 2) come after
      // 3. Within each group, sort by due time (earliest first)
      dueNow.sort((a, b) => {
        const aIsLearning = a.state === 1 || a.state === 3; // Learning or Relearning
        const bIsLearning = b.state === 1 || b.state === 3;
        
        if (aIsLearning && !bIsLearning) return -1; // a is learning, prioritize it
        if (!aIsLearning && bIsLearning) return 1;  // b is learning, prioritize it
        
        // Same type - sort by due time
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      });
      
      // Sort due-later cards by due time for future processing
      dueLater.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

      // Reconstruct the session queue: [already shown cards] + [due now sorted] + [due later sorted]
      const alreadyShown = currentSession.cards.slice(0, currentSession.current_index + 1);
      const reorderedCards = [...alreadyShown, ...dueNow, ...dueLater];

      const updatedSession = {
        ...currentSession,
        cards: reorderedCards
      };

      // Log detailed queue status for debugging
      const learningCards = dueNow.filter(c => c.state === 1 || c.state === 3).length;
      const reviewCards = dueNow.filter(c => c.state === 2).length;
      
      
      set({ currentSession: updatedSession });
    },

    insertCardAtCorrectPosition: (card: StudyCard) => {
      const { currentSession } = get();
      if (!currentSession) return;

      
      const now = new Date();
      const cardDueTime = new Date(card.due);
      const minutesUntilDue = (cardDueTime.getTime() - now.getTime()) / (1000 * 60);
      

      // CRITICAL FIX: If card is due in the future, ensure proper spacing
      const currentIndex = currentSession.current_index;
      const beforeCurrent = currentSession.cards.slice(0, currentIndex + 1);
      const afterCurrent = currentSession.cards.slice(currentIndex + 1);
      
      let insertionIndex = 0;

      if (minutesUntilDue > 0.5) {
        // Card is due in the future - ensure minimum buffer spacing
        // Calculate minimum buffer: at least 2-3 cards should be shown before this one reappears
        const minimumBuffer = Math.max(2, Math.min(5, Math.floor(minutesUntilDue / 2)));
        
        
        // Insert after the minimum buffer, but still respect time ordering
        insertionIndex = Math.min(minimumBuffer, afterCurrent.length);
        
        // Within the post-buffer range, find correct time-based position
        for (let i = insertionIndex; i < afterCurrent.length; i++) {
          const existingCardDue = new Date(afterCurrent[i].due).getTime();
          const newCardDue = cardDueTime.getTime();
          
          if (newCardDue <= existingCardDue) {
            insertionIndex = i;
            break;
          }
          insertionIndex = i + 1;
        }
      } else {
        // Card is due now or very soon - use pure time-based ordering
        for (let i = 0; i < afterCurrent.length; i++) {
          const existingCardDue = new Date(afterCurrent[i].due).getTime();
          const newCardDue = cardDueTime.getTime();
          
          if (newCardDue <= existingCardDue) {
            insertionIndex = i;
            break;
          }
          insertionIndex = i + 1;
        }
      }

      // Insert the card at the calculated position
      const newAfterCurrent = [
        ...afterCurrent.slice(0, insertionIndex),
        card,
        ...afterCurrent.slice(insertionIndex)
      ];

      const updatedCards = [...beforeCurrent, ...newAfterCurrent];
      
      const updatedSession = {
        ...currentSession,
        cards: updatedCards,
        total_cards: currentSession.total_cards + 1
      };

      set({ currentSession: updatedSession });
    }
  }))
);