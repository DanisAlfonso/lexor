export interface Document {
  id: string;
  title: string;
  filePath: string;
  fileType: 'epub' | 'md' | 'pdf';
  fileSize: number;
  language?: string;
  createdAt: number;
  lastOpened?: number;
  readingProgress: number;
  totalPages?: number;
  currentPage: number;
}

export interface Flashcard {
  id: string;
  documentId: string;
  frontText: string;
  backText: string;
  context?: string;
  sourceLocation?: string;
  difficulty: number;
  nextReview?: number;
  reviewCount: number;
  correctCount: number;
  createdAt: number;
}

export interface ReadingSession {
  id: string;
  documentId: string;
  startTime: number;
  endTime?: number;
  pagesRead: number;
  wordsLearned: number;
}

export interface Annotation {
  id: string;
  documentId: string;
  type: 'bookmark' | 'highlight' | 'note';
  content?: string;
  location: string;
  color?: string;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: string;
}