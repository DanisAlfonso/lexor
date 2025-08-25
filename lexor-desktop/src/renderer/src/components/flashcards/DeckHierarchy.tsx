import React, { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  FolderIcon, 
  DocumentTextIcon,
  PlayIcon,
  PlusIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Deck, DeckStats } from '../../../../shared/types/flashcards';
import { useFlashcardStore } from '../../stores/flashcardStore';
import { useAppStore } from '../../stores/appStore';

interface DeckHierarchyProps {
  onSelectDeck?: (deck: Deck) => void;
  onStartStudy?: (deck: Deck, includeChildren: boolean) => void;
  showActions?: boolean;
}

interface DeckNodeProps {
  deck: Deck;
  depth: number;
  isExpanded: boolean;
  onToggleExpand: (deckId: number) => void;
  onSelectDeck: (deck: Deck) => void;
  onStartStudy: (deck: Deck, includeChildren: boolean) => void;
  showActions: boolean;
  isDarkMode: boolean;
}

const DeckNode: React.FC<DeckNodeProps> = ({
  deck,
  depth,
  isExpanded,
  onToggleExpand,
  onSelectDeck,
  onStartStudy,
  showActions,
  isDarkMode
}) => {
  const hasChildren = deck.children && deck.children.length > 0;
  const [showMenu, setShowMenu] = useState(false);
  const [stats, setStats] = useState<DeckStats | null>(null);
  const { service } = useFlashcardStore();

  // Load stats for this deck
  useEffect(() => {
    const loadStats = async () => {
      if (deck.id) {
        try {
          const deckStats = await service.getDeckStats(deck.id, hasChildren);
          setStats(deckStats);
        } catch (error) {
          console.error('Failed to load deck stats:', error);
        }
      }
    };
    loadStats();
  }, [deck.id, service, hasChildren]);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(deck.id!);
    }
  };

  const handleStudyClick = (e: React.MouseEvent, includeChildren = false) => {
    e.stopPropagation();
    setShowMenu(false);
    onStartStudy(deck, includeChildren);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const indentationLevel = depth * 20;
  const hasCards = (stats?.total_cards || 0) > 0;
  const hasDueCards = (stats?.due_cards || 0) > 0;

  return (
    <>
      <div
        className={clsx(
          'group relative flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200',
          'hover:bg-opacity-50',
          isDarkMode 
            ? 'hover:bg-kanagawa-ink5 text-kanagawa-oldwhite' 
            : 'hover:bg-gray-100 text-gray-900'
        )}
        style={{ 
          paddingLeft: `${indentationLevel + 12}px`,
          borderLeft: depth > 0 ? `2px solid ${deck.color || '#6B7280'}20` : 'none'
        }}
        onClick={() => onSelectDeck(deck)}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggleExpand}
          className={clsx(
            'mr-2 p-1 rounded transition-colors duration-200',
            hasChildren 
              ? isDarkMode 
                ? 'hover:bg-kanagawa-ink4 text-kanagawa-oldwhite' 
                : 'hover:bg-gray-200 text-gray-600'
              : 'invisible'
          )}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>

        {/* Icon */}
        <div
          className="mr-3 p-1.5 rounded-md flex-shrink-0"
          style={{ backgroundColor: `${deck.color || '#6B7280'}20` }}
        >
          {deck.is_collection ? (
            <FolderIcon 
              className="h-4 w-4" 
              style={{ color: deck.color || '#6B7280' }}
            />
          ) : (
            <DocumentTextIcon 
              className="h-4 w-4" 
              style={{ color: deck.color || '#6B7280' }}
            />
          )}
        </div>

        {/* Deck Name and Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={clsx(
                'text-sm font-medium truncate',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                {deck.name}
              </h3>
              {stats && (
                <p className={clsx(
                  'text-xs mt-0.5',
                  isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
                )}>
                  {stats.total_cards > 0 ? (
                    <>
                      {stats.due_cards > 0 && (
                        <span className="text-primary-500 font-medium">
                          {stats.due_cards} due
                        </span>
                      )}
                      {stats.due_cards > 0 && stats.total_cards > stats.due_cards && (
                        <span className="mx-1">•</span>
                      )}
                      {stats.total_cards > stats.due_cards && (
                        <span>{stats.total_cards} total</span>
                      )}
                      {stats.new_cards > 0 && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="text-blue-500">{stats.new_cards} new</span>
                        </>
                      )}
                    </>
                  ) : (
                    'No cards'
                  )}
                </p>
              )}
            </div>

            {/* Due Cards Badge */}
            {hasDueCards && (
              <div className={clsx(
                'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                'bg-primary-100 text-primary-700'
              )}>
                {stats?.due_cards}
              </div>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && hasCards && (
          <div className="relative ml-2">
            <button
              onClick={handleMenuToggle}
              className={clsx(
                'p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                isDarkMode 
                  ? 'hover:bg-kanagawa-ink4 text-kanagawa-oldwhite' 
                  : 'hover:bg-gray-200 text-gray-600'
              )}
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className={clsx(
                'absolute right-0 mt-1 w-48 rounded-md shadow-lg z-10 border',
                isDarkMode 
                  ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
                  : 'bg-white border-gray-200'
              )}>
                <div className="py-1">
                  <button
                    onClick={(e) => handleStudyClick(e, false)}
                    disabled={!stats?.due_cards}
                    className={clsx(
                      'flex items-center w-full px-4 py-2 text-sm text-left transition-colors duration-200',
                      stats?.due_cards 
                        ? isDarkMode
                          ? 'hover:bg-kanagawa-ink5 text-kanagawa-oldwhite'
                          : 'hover:bg-gray-100 text-gray-900'
                        : isDarkMode
                          ? 'text-kanagawa-gray cursor-not-allowed'
                          : 'text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Study This Deck ({stats?.due_cards || 0})
                  </button>
                  
                  {hasChildren && (
                    <button
                      onClick={(e) => handleStudyClick(e, true)}
                      disabled={!stats?.due_cards}
                      className={clsx(
                        'flex items-center w-full px-4 py-2 text-sm text-left transition-colors duration-200',
                        stats?.due_cards 
                          ? isDarkMode
                            ? 'hover:bg-kanagawa-ink5 text-kanagawa-oldwhite'
                            : 'hover:bg-gray-100 text-gray-900'
                          : isDarkMode
                            ? 'text-kanagawa-gray cursor-not-allowed'
                            : 'text-gray-400 cursor-not-allowed'
                      )}
                    >
                      <FolderIcon className="h-4 w-4 mr-2" />
                      Study Collection ({stats?.due_cards || 0})
                    </button>
                  )}

                  <div className={clsx(
                    'my-1 border-t',
                    isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200'
                  )} />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      // TODO: Implement edit functionality
                    }}
                    className={clsx(
                      'flex items-center w-full px-4 py-2 text-sm text-left transition-colors duration-200',
                      isDarkMode
                        ? 'hover:bg-kanagawa-ink5 text-kanagawa-oldwhite'
                        : 'hover:bg-gray-100 text-gray-900'
                    )}
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Edit Deck
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {deck.children!.map((child) => (
            <DeckNode
              key={child.id}
              deck={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
              onSelectDeck={onSelectDeck}
              onStartStudy={onStartStudy}
              showActions={showActions}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}
    </>
  );
};

export const DeckHierarchy: React.FC<DeckHierarchyProps> = ({
  onSelectDeck = () => {},
  onStartStudy = () => {},
  showActions = true
}) => {
  const { theme } = useAppStore();
  const { decks, loadDecks, isLoading } = useFlashcardStore();
  const [expandedDecks, setExpandedDecks] = useState<Set<number>>(new Set());
  const [hierarchicalDecks, setHierarchicalDecks] = useState<Deck[]>([]);

  // Determine theme
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Load decks on mount
  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Build hierarchy when decks change
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
              deckWithChildren.depth = (parent.depth || 0) + 1;
            }
          } else {
            rootDecks.push(deckWithChildren);
            deckWithChildren.depth = 0;
          }
        }

        return rootDecks;
      };

      setHierarchicalDecks(buildHierarchy());
    }
  }, [decks]);

  const handleToggleExpand = (deckId: number) => {
    setExpandedDecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) {
        newSet.delete(deckId);
      } else {
        newSet.add(deckId);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    const allDeckIds = new Set(decks.filter(d => d.children?.length).map(d => d.id!));
    setExpandedDecks(allDeckIds);
  };

  const handleCollapseAll = () => {
    setExpandedDecks(new Set());
  };

  if (isLoading) {
    return (
      <div className={clsx(
        'flex items-center justify-center p-8',
        isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
      )}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
        Loading decks...
      </div>
    );
  }

  if (hierarchicalDecks.length === 0) {
    return (
      <div className={clsx(
        'text-center p-8',
        isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
      )}>
        <FolderIcon className={clsx(
          'mx-auto h-12 w-12 mb-4',
          isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
        )} />
        <h3 className={clsx(
          'text-lg font-medium mb-2',
          isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
        )}>
          No flashcard decks yet
        </h3>
        <p className="mb-6">
          Create flashcards in your markdown files using the Flash notation
        </p>
        <button className={clsx(
          'inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
          isDarkMode 
            ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
            : 'bg-primary-600 hover:bg-primary-700 text-white'
        )}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Import from Current File
        </button>
      </div>
    );
  }

  return (
    <div className={clsx(
      'h-full flex flex-col',
      isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
    )}>
      {/* Header with controls */}
      <div className={clsx(
        'flex items-center justify-between p-4 border-b',
        isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200'
      )}>
        <h2 className={clsx(
          'text-lg font-semibold',
          isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
        )}>
          Flashcard Collections
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExpandAll}
            className={clsx(
              'px-3 py-1 text-xs rounded-md transition-colors duration-200',
              isDarkMode
                ? 'hover:bg-kanagawa-ink4 text-kanagawa-oldwhite'
                : 'hover:bg-gray-200 text-gray-600'
            )}
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className={clsx(
              'px-3 py-1 text-xs rounded-md transition-colors duration-200',
              isDarkMode
                ? 'hover:bg-kanagawa-ink4 text-kanagawa-oldwhite'
                : 'hover:bg-gray-200 text-gray-600'
            )}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Deck Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {hierarchicalDecks.map((deck) => (
            <DeckNode
              key={deck.id}
              deck={deck}
              depth={0}
              isExpanded={expandedDecks.has(deck.id!)}
              onToggleExpand={handleToggleExpand}
              onSelectDeck={onSelectDeck}
              onStartStudy={onStartStudy}
              showActions={showActions}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};