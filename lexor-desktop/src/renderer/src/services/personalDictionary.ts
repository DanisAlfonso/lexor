export class PersonalDictionary {
  private static instance: PersonalDictionary | null = null;
  private ignoredWords: Set<string> = new Set();
  private storageKey = 'lexor-personal-dictionary';

  static getInstance(): PersonalDictionary {
    if (!PersonalDictionary.instance) {
      PersonalDictionary.instance = new PersonalDictionary();
    }
    return PersonalDictionary.instance;
  }

  private constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const words = JSON.parse(stored);
        this.ignoredWords = new Set(words);
      }
    } catch (error) {
      console.error('Failed to load personal dictionary:', error);
      this.ignoredWords = new Set();
    }
  }

  private saveToStorage(): void {
    try {
      const words = Array.from(this.ignoredWords);
      localStorage.setItem(this.storageKey, JSON.stringify(words));
    } catch (error) {
      console.error('Failed to save personal dictionary:', error);
    }
  }

  /**
   * Add a word to the ignored words list
   */
  addIgnoredWord(word: string): void {
    if (!word || word.trim().length === 0) {
      return;
    }
    
    const normalizedWord = word.trim().toLowerCase();
    this.ignoredWords.add(normalizedWord);
    this.saveToStorage();
  }

  /**
   * Remove a word from the ignored words list
   */
  removeIgnoredWord(word: string): void {
    const normalizedWord = word.trim().toLowerCase();
    this.ignoredWords.delete(normalizedWord);
    this.saveToStorage();
  }

  /**
   * Check if a word is in the ignored words list
   */
  isWordIgnored(word: string): boolean {
    if (!word || word.trim().length === 0) {
      return false;
    }
    
    const normalizedWord = word.trim().toLowerCase();
    return this.ignoredWords.has(normalizedWord);
  }

  /**
   * Get all ignored words
   */
  getIgnoredWords(): string[] {
    return Array.from(this.ignoredWords).sort();
  }

  /**
   * Clear all ignored words
   */
  clearAll(): void {
    this.ignoredWords.clear();
    this.saveToStorage();
  }

  /**
   * Export ignored words for backup
   */
  export(): string {
    return JSON.stringify(Array.from(this.ignoredWords));
  }

  /**
   * Import ignored words from backup
   */
  import(data: string): void {
    try {
      const words = JSON.parse(data);
      if (Array.isArray(words)) {
        this.ignoredWords = new Set(words.map(w => String(w).trim().toLowerCase()));
        this.saveToStorage();
      }
    } catch (error) {
      console.error('Failed to import personal dictionary:', error);
      throw new Error('Invalid dictionary format');
    }
  }

  /**
   * Get word statistics
   */
  getStats(): { totalWords: number; lastModified?: number } {
    return {
      totalWords: this.ignoredWords.size,
      lastModified: this.getLastModified()
    };
  }

  private getLastModified(): number | undefined {
    try {
      const stored = localStorage.getItem(this.storageKey + '_timestamp');
      return stored ? parseInt(stored) : undefined;
    } catch {
      return undefined;
    }
  }
}