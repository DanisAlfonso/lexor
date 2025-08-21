import React from 'react';
import { PlusIcon, FolderIcon } from '@heroicons/react/24/outline';

export function FlashcardView() {
  return (
    <div className="h-full p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Flashcards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage your flashcard decks for effective learning
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4 mb-8">
          <button className="btn-primary flex items-center space-x-2">
            <PlusIcon className="h-4 w-4" />
            <span>New Deck</span>
          </button>
          <button className="btn-secondary flex items-center space-x-2">
            <PlusIcon className="h-4 w-4" />
            <span>New Card</span>
          </button>
        </div>

        {/* Deck list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Empty state */}
          <div className="col-span-full">
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No flashcard decks yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Create your first deck to start learning with flashcards
              </p>
              <button className="btn-primary">
                Create First Deck
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}