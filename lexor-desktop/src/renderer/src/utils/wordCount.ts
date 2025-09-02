/**
 * Advanced word counting utility for markdown content
 * Provides accurate word, character, and paragraph counts
 */

export interface DocumentStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readingTimeMinutes: number;
  lines: number;
}

/**
 * Calculate comprehensive document statistics
 */
export function calculateDocumentStats(content: string): DocumentStats {
  if (!content || content.trim().length === 0) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      paragraphs: 0,
      readingTimeMinutes: 0,
      lines: 0,
    };
  }

  // Remove markdown syntax for accurate word counting
  const cleanText = cleanMarkdown(content);
  
  // Count words (split by whitespace, filter empty strings)
  const words = cleanText
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  // Count characters
  const characters = content.length;
  const charactersNoSpaces = content.replace(/\s/g, '').length;
  
  // Count paragraphs (non-empty lines separated by blank lines)
  const paragraphs = content
    .split(/\n\s*\n/)
    .filter(paragraph => paragraph.trim().length > 0)
    .length;
  
  // Count lines
  const lines = content.split('\n').length;
  
  // Estimate reading time (average 200 words per minute)
  const readingTimeMinutes = Math.max(1, Math.round(words.length / 200));

  return {
    words: words.length,
    characters,
    charactersNoSpaces,
    paragraphs,
    readingTimeMinutes,
    lines,
  };
}

/**
 * Clean markdown syntax from text for accurate word counting
 */
function cleanMarkdown(markdown: string): string {
  return markdown
    // Remove headers (# ## ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic (**text** *text*)
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    // Remove strikethrough (~~text~~)
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks (```code```)
    .replace(/```[\s\S]*?```/g, '')
    // Remove links ([text](url) or [text][ref])
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    // Remove images (![alt](url))
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove reference definitions ([ref]: url)
    .replace(/^\[[^\]]+\]:\s*.+$/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove blockquotes (> text)
    .replace(/^>\s?/gm, '')
    // Remove list markers (- * + 1.)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove horizontal rules (--- or ***)
    .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '')
    // Remove flashcard syntax (## Flash: question ### Answer: answer)
    .replace(/^#{2,3}\s*(Flash:|Answer:)\s*/gm, '')
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Format word count for display
 */
export function formatWordCount(count: number): string {
  if (count === 0) return '0 words';
  if (count === 1) return '1 word';
  if (count < 1000) return `${count} words`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k words`;
  return `${Math.round(count / 1000)}k words`;
}

/**
 * Format reading time for display
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min read';
  if (minutes === 1) return '1 min read';
  if (minutes < 60) return `${minutes} min read`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour read' : `${hours} hours read`;
  }
  
  return `${hours}h ${remainingMinutes}m read`;
}

/**
 * Format character count for display
 */
export function formatCharacterCount(count: number): string {
  if (count < 1000) return `${count} chars`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k chars`;
  return `${Math.round(count / 1000)}k chars`;
}