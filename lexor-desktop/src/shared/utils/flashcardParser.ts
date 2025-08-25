import { ParsedFlashcard, FlashcardNotation } from '../types/flashcards';

export class FlashcardParser {
  // Main patterns for flashcard notation
  private static readonly FLASH_PATTERNS = {
    // ## Flash: Question text
    // ### Answer: Answer text
    basic: /^## Flash: (.+)$/gm,
    answer: /^### Answer: ?(.*)$/gm,
    
    // Cloze deletion: {{c1::answer}} in question
    cloze: /\{\{c(\d+)::([^}]+)\}\}/g,
    
    // Media references
    image: /!\[([^\]]*)\]\(([^)]+)\)/g,
    audio: /\[(?:audio|inline): ?([^\]]+)\]\(([^)]+)\)/g,
  };

  /**
   * Parse markdown content to extract flashcards
   */
  public static parseMarkdown(content: string, filePath?: string): ParsedFlashcard[] {
    const lines = content.split('\n');
    const flashcards: ParsedFlashcard[] = [];
    
    let currentCard: Partial<ParsedFlashcard> | null = null;
    let inAnswerSection = false;
    let answerLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Check for flash card start
      const flashMatch = line.match(/^## Flash: (.+)$/);
      if (flashMatch) {
        // Save previous card if exists
        if (currentCard && currentCard.front) {
          this.finalizeCard(currentCard, answerLines, flashcards);
        }
        
        // Start new card
        currentCard = {
          front: flashMatch[1].trim(),
          source_line: lineNumber,
        };
        inAnswerSection = false;
        answerLines = [];
        continue;
      }
      
      // Check for answer section
      const answerMatch = line.match(/^### Answer: ?(.*)$/);
      if (answerMatch && currentCard) {
        inAnswerSection = true;
        answerLines = [answerMatch[1]];
        continue;
      }
      
      // If we're in answer section, collect lines
      if (inAnswerSection && currentCard) {
        // Check for end of answer section (next heading or flash card)
        if (line.match(/^#{1,6} /) && !line.match(/^### /)) {
          // End of answer section
          inAnswerSection = false;
          this.finalizeCard(currentCard, answerLines, flashcards);
          currentCard = null;
          answerLines = [];
        } else if (!line.match(/^## Flash: /)) {
          // Continue collecting answer lines
          answerLines.push(line);
        }
      }
    }
    
    // Handle last card
    if (currentCard && currentCard.front) {
      this.finalizeCard(currentCard, answerLines, flashcards);
    }
    
    return flashcards;
  }
  
  /**
   * Finalize a flashcard by processing answer and extracting media
   */
  private static finalizeCard(
    card: Partial<ParsedFlashcard>, 
    answerLines: string[], 
    flashcards: ParsedFlashcard[]
  ): void {
    if (!card.front) return;
    
    const answerText = answerLines.join('\n').trim();
    if (!answerText) return;
    
    // Extract media paths from both front and back
    const mediaPaths = new Set<string>();
    
    // Extract from front
    this.extractMediaPaths(card.front, mediaPaths);
    
    // Extract from answer
    this.extractMediaPaths(answerText, mediaPaths);
    
    flashcards.push({
      front: card.front,
      back: answerText,
      media_paths: mediaPaths.size > 0 ? Array.from(mediaPaths) : undefined,
      source_line: card.source_line || 0,
    });
  }
  
  /**
   * Extract media file paths from text content
   */
  private static extractMediaPaths(text: string, mediaPaths: Set<string>): void {
    // Extract image paths
    const imageMatches = Array.from(text.matchAll(this.FLASH_PATTERNS.image));
    for (const match of imageMatches) {
      mediaPaths.add(match[2]);
    }
    
    // Extract audio paths
    const audioMatches = Array.from(text.matchAll(this.FLASH_PATTERNS.audio));
    for (const match of audioMatches) {
      mediaPaths.add(match[2]);
    }
  }
  
  /**
   * Generate flashcard markdown from parsed cards
   */
  public static generateMarkdown(cards: ParsedFlashcard[]): string {
    return cards.map(card => {
      let markdown = `## Flash: ${card.front}\n### Answer: ${card.back}`;
      return markdown;
    }).join('\n\n');
  }
  
  /**
   * Parse cloze deletions from text
   */
  public static parseClozeCard(text: string): FlashcardNotation[] {
    const clozeMatches = Array.from(text.matchAll(this.FLASH_PATTERNS.cloze));
    
    if (clozeMatches.length === 0) {
      return [];
    }
    
    const cards: FlashcardNotation[] = [];
    const clozeDeletions = new Map<number, string[]>();
    
    // Group cloze deletions by number
    for (const match of clozeMatches) {
      const clozeNum = parseInt(match[1]);
      const clozeText = match[2];
      
      if (!clozeDeletions.has(clozeNum)) {
        clozeDeletions.set(clozeNum, []);
      }
      clozeDeletions.get(clozeNum)!.push(clozeText);
    }
    
    // Generate cards for each cloze deletion
    for (const [clozeNum, deletions] of clozeDeletions.entries()) {
      const front = text.replace(
        new RegExp(`\\{\\{c${clozeNum}::([^}]+)\\}\\}`, 'g'),
        '[...]'
      );
      
      const back = deletions.join(', ');
      
      cards.push({
        type: 'cloze',
        content: {
          front,
          back,
          source_line: 0, // Would need to be passed in
        },
      });
    }
    
    return cards;
  }
  
  /**
   * Validate flashcard content
   */
  public static validateCard(card: ParsedFlashcard): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!card.front || card.front.trim().length === 0) {
      errors.push('Front of card cannot be empty');
    }
    
    if (!card.back || card.back.trim().length === 0) {
      errors.push('Back of card cannot be empty');
    }
    
    if (card.front && card.front.length > 1000) {
      errors.push('Front of card is too long (max 1000 characters)');
    }
    
    if (card.back && card.back.length > 5000) {
      errors.push('Back of card is too long (max 5000 characters)');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Check if markdown content contains flashcards
   */
  public static hasFlashcards(content: string): boolean {
    return this.FLASH_PATTERNS.basic.test(content);
  }
  
  /**
   * Count flashcards in markdown content
   */
  public static countFlashcards(content: string): number {
    const matches = content.match(this.FLASH_PATTERNS.basic);
    return matches ? matches.length : 0;
  }
}