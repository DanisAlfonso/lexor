import React from 'react';
import { ChartBarIcon, PlayIcon } from '@heroicons/react/24/outline';

export function StudySession() {
  return (
    <div className="h-full p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Study Session
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review your flashcards and track your learning progress
          </p>
        </div>

        {/* Study options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Quick Review
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Review cards that are due for today
            </p>
            <button className="btn-primary flex items-center space-x-2">
              <PlayIcon className="h-4 w-4" />
              <span>Start Review</span>
            </button>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Study Statistics
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              View your learning progress and statistics
            </p>
            <button className="btn-secondary flex items-center space-x-2">
              <ChartBarIcon className="h-4 w-4" />
              <span>View Stats</span>
            </button>
          </div>
        </div>

        {/* Empty state */}
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No study session active
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Create some flashcards first, then come back to study
          </p>
        </div>
      </div>
    </div>
  );
}