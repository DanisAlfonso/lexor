import React, { useState, useEffect } from 'react';
import {
  FolderIcon,
  DocumentTextIcon,
  PlayIcon,
  ChevronRightIcon,
  HomeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Deck, DeckStats } from '../../../../shared/types/flashcards';
import { useFlashcardStore } from '../../stores/flashcardStore';
import { useAppStore } from '../../stores/appStore';

interface CollectionGridProps {
  onStartStudy?: (deck: Deck) => void;
}

interface CollectionCardProps {
  deck: Deck;
  onNavigate: (deck: Deck) => void;
  onStudy: (deck: Deck) => void;
  isDarkMode: boolean;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  deck,
  onNavigate,
  onStudy,
  isDarkMode
}) => {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const { service } = useFlashcardStore();
  const isCollection = !deck.file_path;

  // Load stats for this deck
  useEffect(() => {
    const loadStats = async () => {
      if (deck.id) {
        try {
          const deckStats = await service.getDeckStats(deck.id, isCollection);
          setStats(deckStats);
        } catch (error) {
          console.error('Failed to load deck stats:', error);
        }
      }
    };
    loadStats();
  }, [deck.id, service, isCollection]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCollection && deck.children && deck.children.length > 0) {
      onNavigate(deck);
    }
  };

  const handleStudyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStudy(deck);
  };

  const cardCount = stats?.total_cards || deck.card_count || 0;
  const dueCards = stats?.due_cards || 0;
  const newCards = stats?.new_cards || 0;

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        'group relative rounded-2xl p-6 transition-all duration-300 ease-out',
        'hover:scale-105 hover:-translate-y-1 cursor-pointer',
        'border backdrop-blur-sm',
        isDarkMode
          ? 'bg-kanagawa-ink4/80 border-kanagawa-ink5 hover:bg-kanagawa-ink4 hover:border-kanagawa-ink6'
          : 'bg-white/90 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-xl'
      )}
      style={{
        boxShadow: isDarkMode
          ? '0 4px 20px rgba(0, 0, 0, 0.2)'
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Icon and Navigation Arrow */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-xl transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: `${deck.color || '#6B7280'}20` }}
        >
          {isCollection ? (
            <FolderIcon
              className="h-6 w-6"
              style={{ color: deck.color || '#6B7280' }}
            />
          ) : (
            <DocumentTextIcon
              className="h-6 w-6"
              style={{ color: deck.color || '#6B7280' }}
            />
          )}
        </div>

        {isCollection && deck.children && deck.children.length > 0 && (
          <ChevronRightIcon
            className={clsx(
              'h-5 w-5 opacity-0 group-hover:opacity-100 transition-all duration-200',
              'transform group-hover:translate-x-1',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
            )}
          />
        )}
      </div>

      {/* Title */}
      <h3 className={clsx(
        'text-lg font-semibold mb-2 truncate',
        isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
      )}>
        {deck.name}
      </h3>

      {/* Description */}
      {deck.description && (
        <p className={clsx(
          'text-sm mb-3 line-clamp-2',
          isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
        )}>
          {deck.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className={clsx(
            'text-2xl font-bold',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            {cardCount}
          </span>
          <span className={clsx(
            'text-xs',
            isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
          )}>
            {cardCount === 1 ? 'card' : 'cards'}
          </span>
        </div>

        {(dueCards > 0 || newCards > 0) && (
          <div className="flex flex-col items-end">
            {dueCards > 0 && (
              <div className={clsx(
                'px-2 py-1 rounded-full text-xs font-medium mb-1',
                'bg-primary-500/20 text-primary-600'
              )}>
                {dueCards} due
              </div>
            )}
            {newCards > 0 && (
              <div className={clsx(
                'px-2 py-1 rounded-full text-xs font-medium',
                'bg-blue-500/20 text-blue-600'
              )}>
                {newCards} new
              </div>
            )}
          </div>
        )}
      </div>

      {/* Study Button */}
      {cardCount > 0 && (
        <button
          onClick={handleStudyClick}
          className={clsx(
            'w-full flex items-center justify-center space-x-2 py-3 rounded-xl',
            'font-medium transition-all duration-200',
            'opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0',
            isDarkMode
              ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          )}
        >
          <PlayIcon className="h-4 w-4" />
          <span>{isCollection ? 'Study Collection' : 'Study This Deck'}</span>
        </button>
      )}

      {/* Empty State for Collections with No Cards */}
      {cardCount === 0 && isCollection && (
        <div className={clsx(
          'w-full py-3 text-center text-sm opacity-60',
          isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
        )}>
          No cards yet
        </div>
      )}
    </div>
  );
};

export const CollectionGrid: React.FC<CollectionGridProps> = ({
  onStartStudy = () => {}
}) => {
  const { theme } = useAppStore();
  const { decks, loadDecks, isLoading } = useFlashcardStore();
  const [currentPath, setCurrentPath] = useState<Deck[]>([]);
  const [currentDecks, setCurrentDecks] = useState<Deck[]>([]);

  // Determine theme
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Load decks on mount
  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Build hierarchy and set current view
  useEffect(() => {
    if (decks.length > 0) {
      const buildHierarchy = () => {
        const deckMap = new Map<number, Deck>();
        const rootDecks: Deck[] = [];

        // First pass: create lookup map
        for (const deck of decks) {
          deckMap.set(deck.id!, { ...deck, children: [] });
        }

        // Second pass: build hierarchy
        for (const deck of decks) {
          const deckWithChildren = deckMap.get(deck.id!)!;
          
          if (deck.parent_id) {
            const parent = deckMap.get(deck.parent_id);
            if (parent) {
              parent.children!.push(deckWithChildren);
            }
          } else {
            rootDecks.push(deckWithChildren);
          }
        }

        return rootDecks;
      };

      const hierarchy = buildHierarchy();
      
      // Set current decks based on navigation path
      if (currentPath.length === 0) {
        setCurrentDecks(hierarchy);
      } else {
        const currentParent = currentPath[currentPath.length - 1];
        setCurrentDecks(currentParent.children || []);
      }
    }
  }, [decks, currentPath]);

  const handleNavigate = (deck: Deck) => {
    setCurrentPath([...currentPath, deck]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  const handleHomeClick = () => {
    setCurrentPath([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={handleHomeClick}
          className={clsx(
            'flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium',
            'transition-colors duration-200',
            isDarkMode
              ? 'text-kanagawa-oldwhite hover:bg-kanagawa-ink5'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <HomeIcon className="h-4 w-4" />
          <span>Flashcards</span>
        </button>

        {currentPath.map((deck, index) => (
          <React.Fragment key={deck.id}>
            <ChevronRightIcon className={clsx(
              'h-4 w-4',
              isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
            )} />
            <button
              onClick={() => handleBreadcrumbClick(index + 1)}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                index === currentPath.length - 1
                  ? isDarkMode
                    ? 'text-kanagawa-white bg-kanagawa-ink5'
                    : 'text-gray-900 bg-gray-100'
                  : isDarkMode
                    ? 'text-kanagawa-oldwhite hover:bg-kanagawa-ink5'
                    : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {deck.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Collection Grid */}
      <div className="flex-1 overflow-y-auto">
        {currentDecks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentDecks.map((deck) => (
              <CollectionCard
                key={deck.id}
                deck={deck}
                onNavigate={handleNavigate}
                onStudy={onStartStudy}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={clsx(
              'p-4 rounded-full mb-4',
              isDarkMode ? 'bg-kanagawa-ink5' : 'bg-gray-100'
            )}>
              <FolderIcon className={clsx(
                'h-12 w-12',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
              )} />
            </div>
            <h3 className={clsx(
              'text-lg font-medium mb-2',
              isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
            )}>
              No flashcards yet
            </h3>
            <p className={clsx(
              'text-sm mb-6 max-w-md',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
            )}>
              Create flashcards in your markdown files using the Flash notation, or import existing flashcard files.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};