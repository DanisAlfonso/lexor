export * from './user';
export * from './document';
export * from './flashcard';
export * from './reading-session';
export * from './annotation';

import { users } from './user';
import { documents } from './document';
import { flashcards } from './flashcard';
import { readingSessions } from './reading-session';
import { annotations } from './annotation';

export const schema = {
  users,
  documents,
  flashcards,
  readingSessions,
  annotations,
};