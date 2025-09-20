// FSRS algorithm types
export interface FSRSCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review?: Date;
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

// Database entity types
export interface Deck {
  id?: number;
  name: string;
  description?: string;
  file_path?: string;
  parent_id?: number;
  collection_path?: string;
  tags?: string[]; // Array of tag strings
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  card_count?: number;
  
  // Computed fields for UI
  children?: Deck[];
  depth?: number;
  full_path?: string;
  is_collection?: boolean; // True if it's a folder-based collection
}

export interface Flashcard {
  id?: number;
  deck_id: number;
  front: string;
  back: string;
  media_paths?: string; // JSON string array
  source_file?: string;
  source_line?: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id?: number;
  card_id: number;
  rating: Rating;
  scheduled_days: number;
  actual_days: number;
  review_date: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  lapses: number;
  reps: number;
  state: CardState;
}

// Study session types
export interface StudyCard {
  id: number;
  deck_id: number;
  deck_name: string;
  front: string;
  back: string;
  media_paths?: string[];
  source_file?: string;
  source_line?: number;
  
  // FSRS state
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review?: Date;
}

export interface StudySession {
  deck_id?: number; // Optional - for mixed sessions
  cards: StudyCard[];
  current_index: number;
  session_start: Date;
  cards_reviewed: number;
  total_cards: number;
}

export interface DeckStats {
  total_cards: number;
  new_cards: number;
  learning_cards: number;
  review_cards: number;
  due_cards: number;
}

// Markdown parsing types
export interface ParsedFlashcard {
  front: string;
  back: string;
  media_paths?: string[];
  source_line: number;
}

export interface FlashcardNotation {
  type: 'basic' | 'cloze' | 'image' | 'audio';
  content: ParsedFlashcard;
}

// UI types
export interface FlashcardViewState {
  selectedDeck?: Deck;
  isStudying: boolean;
  currentSession?: StudySession;
  showAnswer: boolean;
  studyMode: 'new' | 'due' | 'all';
}

// API response types
export interface CreateDeckResponse {
  success: boolean;
  deck_id?: number;
  error?: string;
}

export interface ImportCardsResponse {
  success: boolean;
  imported_count: number;
  errors?: string[];
  deck_id?: number;
}

export interface StudySessionResponse {
  cards: StudyCard[];
  session_id: string;
}

// User study preferences
export interface StudySettings {
  // Daily limits
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  
  // Session settings
  learnAheadTimeMinutes: number; // How far ahead to show learning cards
  timezoneOffset: number; // For day boundary calculations
  
  // Advanced FSRS settings
  desiredRetention: number; // 0.8 to 0.95
  maximumInterval: number; // In days
  learningSteps: number[]; // Minutes for learning steps
  relearningSteps: number[]; // Minutes for relearning steps
  
  // Display preferences  
  showAnswerTimer: boolean;
  showProgress: boolean;
  
  // Study behavior
  buryRelatedCards: boolean; // Bury cards from same note
  autoAdvance: boolean; // Auto-advance after rating
  rateFromBothSides: boolean; // Allow rating from both question and answer sides
}