import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  FireIcon,
  ClockIcon,
  AcademicCapIcon,
  TrophyIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../stores/appStore';
import { useFlashcardStore } from '../stores/flashcardStore';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: { value: number; isPositive: boolean };
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  isDarkMode: boolean;
}

interface DeckDetailRowProps {
  deck: any;
  isDarkMode: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  detailsData?: any;
  onLoadDetails: () => void;
  isLoadingDetails: boolean;
}

// Utility function to clean multimedia markup from card text
const cleanCardText = (text: string): string => {
  if (!text) return '';
  
  // Remove multimedia markup and clean formatting
  return text
    // Remove multimedia markdown links [inline: text](path) -> keep only the text
    .replace(/\[inline:\s*([^\]]*)\]\([^)]*\)/gi, '$1')
    .replace(/\[audio:\s*([^\]]*)\]\([^)]*\)/gi, '$1')
    .replace(/\[video:\s*([^\]]*)\]\([^)]*\)/gi, '$1')
    .replace(/\[image:\s*([^\]]*)\]\([^)]*\)/gi, '$1')
    // Remove any other multimedia markdown links [type: text](path)
    .replace(/\[[a-zA-Z]+:\s*([^\]]*)\]\([^)]*\)/gi, '$1')
    // Remove standalone multimedia brackets [inline: ...], [audio: ...], etc.
    .replace(/\[inline:\s*[^\]]+\]/gi, '')
    .replace(/\[audio:\s*[^\]]+\]/gi, '')
    .replace(/\[video:\s*[^\]]+\]/gi, '')
    .replace(/\[image:\s*[^\]]+\]/gi, '')
    .replace(/\[[a-zA-Z]+:\s*[^\]]+\]/gi, '')
    // Remove any remaining file paths in parentheses (likely audio/video files)
    .replace(/\([^)]*\.(mp3|wav|mp4|avi|mov|webm|ogg|m4a|flac)[^)]*\)/gi, '')
    // Remove regular markdown links [text](url) -> keep only the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove markdown bold/italic syntax but keep the text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s*/gm, '')
    // Clean up multiple spaces and line breaks
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  isDarkMode
}) => {
  const colorClasses = {
    blue: {
      bg: isDarkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200',
      icon: 'text-blue-500',
      text: isDarkMode ? 'text-blue-300' : 'text-blue-600',
      value: isDarkMode ? 'text-blue-100' : 'text-blue-900'
    },
    green: {
      bg: isDarkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200',
      icon: 'text-green-500',
      text: isDarkMode ? 'text-green-300' : 'text-green-600',
      value: isDarkMode ? 'text-green-100' : 'text-green-900'
    },
    purple: {
      bg: isDarkMode ? 'bg-purple-900/20 border-purple-700/50' : 'bg-purple-50 border-purple-200',
      icon: 'text-purple-500',
      text: isDarkMode ? 'text-purple-300' : 'text-purple-600',
      value: isDarkMode ? 'text-purple-100' : 'text-purple-900'
    },
    orange: {
      bg: isDarkMode ? 'bg-orange-900/20 border-orange-700/50' : 'bg-orange-50 border-orange-200',
      icon: 'text-orange-500',
      text: isDarkMode ? 'text-orange-300' : 'text-orange-600',
      value: isDarkMode ? 'text-orange-100' : 'text-orange-900'
    },
    red: {
      bg: isDarkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      text: isDarkMode ? 'text-red-300' : 'text-red-600',
      value: isDarkMode ? 'text-red-100' : 'text-red-900'
    },
    indigo: {
      bg: isDarkMode ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200',
      icon: 'text-indigo-500',
      text: isDarkMode ? 'text-indigo-300' : 'text-indigo-600',
      value: isDarkMode ? 'text-indigo-100' : 'text-indigo-900'
    }
  };

  const classes = colorClasses[color];

  return (
    <div className={clsx(
      'relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:scale-105',
      classes.bg
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={clsx('text-sm font-medium mb-1', classes.text)}>
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <p className={clsx('text-3xl font-bold', classes.value)}>
              {value}
            </p>
            {trend && (
              <span className={clsx(
                'text-sm font-medium flex items-center',
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              )}>
                <ArrowTrendingUpIcon className={clsx(
                  'h-3 w-3 mr-1',
                  !trend.isPositive && 'rotate-180'
                )} />
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className={clsx('text-xs mt-1', classes.text)}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={clsx('rounded-full p-3', classes.bg)}>
          <Icon className={clsx('h-6 w-6', classes.icon)} />
        </div>
      </div>
    </div>
  );
};

const DeckDetailRow: React.FC<DeckDetailRowProps> = ({
  deck,
  isDarkMode,
  isExpanded,
  onToggle,
  detailsData,
  onLoadDetails,
  isLoadingDetails
}) => {
  const formatNextReviewTime = (minutes: number) => {
    if (minutes === 0) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const getStateColor = (state: number) => {
    switch (state) {
      case 0: return 'text-blue-600 bg-blue-100'; // New
      case 1: return 'text-orange-600 bg-orange-100'; // Learning
      case 2: return 'text-green-600 bg-green-100'; // Review
      case 3: return 'text-yellow-600 bg-yellow-100'; // Relearning
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStateName = (state: number) => {
    switch (state) {
      case 0: return 'New';
      case 1: return 'Learning';
      case 2: return 'Review';
      case 3: return 'Relearning';
      default: return 'Unknown';
    }
  };

  return (
    <>
      <tr className={clsx(
        'border-b last:border-b-0 hover:bg-opacity-50 transition-colors duration-200 cursor-pointer',
        isDarkMode ? 'border-kanagawa-ink5 hover:bg-kanagawa-ink5' : 'border-gray-100 hover:bg-gray-50'
      )} onClick={onToggle}>
        <td className={clsx(
          'py-4 text-sm font-medium flex items-center space-x-3',
          isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
        )}>
          <div className={clsx(
            'transition-transform duration-200',
            isExpanded ? 'rotate-90' : ''
          )}>
            <ChevronRightIcon className="h-4 w-4" />
          </div>
          <span>{deck.name}</span>
        </td>
        <td className={clsx(
          'py-4 text-sm text-center',
          isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
        )}>
          {deck.totalCards}
        </td>
        <td className={clsx(
          'py-4 text-sm text-center',
          isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
        )}>
          {deck.dueCards}
        </td>
        <td className="py-4 text-sm text-center">
          <span className={clsx(
            'px-2 py-1 rounded-full text-xs font-semibold',
            deck.retention >= 80 
              ? 'bg-green-100 text-green-800'
              : deck.retention >= 60
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          )}>
            {deck.retention || 0}%
          </span>
        </td>
        <td className={clsx(
          'py-4 text-sm text-center',
          isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
        )}>
          {deck.avgDifficulty?.toFixed(1) || 'N/A'}
        </td>
        <td className="py-4 text-sm text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLoadDetails();
            }}
            className={clsx(
              'p-1 rounded-lg transition-colors duration-200',
              isDarkMode
                ? 'hover:bg-kanagawa-ink5 text-kanagawa-oldwhite'
                : 'hover:bg-gray-100 text-gray-600'
            )}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>
      
      {/* Expanded Details */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className={clsx(
              'border-t transition-all duration-300 overflow-hidden',
              isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200',
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            )}>
              <div className="p-6">
                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                    <span className={clsx(
                      'ml-3 text-sm',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Loading detailed statistics...
                    </span>
                  </div>
                ) : detailsData ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Deck Summary */}
                    <div className={clsx(
                      'rounded-xl p-4 border',
                      isDarkMode ? 'bg-kanagawa-ink3 border-kanagawa-ink4' : 'bg-gray-50 border-gray-200'
                    )}>
                      <h4 className={clsx(
                        'text-sm font-semibold mb-3',
                        isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                      )}>
                        Deck Overview
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className={isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'}>
                            Total Reviews:
                          </span>
                          <span className={isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'}>
                            {detailsData.deck?.totalReviews || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'}>
                            Avg Difficulty:
                          </span>
                          <span className={isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'}>
                            {detailsData.deck?.avgDifficulty?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'}>
                            Avg Stability:
                          </span>
                          <span className={isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'}>
                            {detailsData.deck?.avgStability?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card List */}
                    <div className={clsx(
                      'rounded-xl border overflow-hidden',
                      isDarkMode ? 'bg-kanagawa-ink3 border-kanagawa-ink4' : 'bg-gray-50 border-gray-200'
                    )}>
                      <div className={clsx(
                        'px-4 py-3 border-b sticky top-0 z-10',
                        isDarkMode ? 'bg-kanagawa-ink3 border-kanagawa-ink4' : 'bg-gray-50 border-gray-200'
                      )}>
                        <h4 className={clsx(
                          'text-sm font-semibold',
                          isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                        )}>
                          Individual Cards ({detailsData.cards?.length || 0})
                        </h4>
                      </div>
                      <div className="p-4 max-h-60 overflow-y-auto">
                      {detailsData.cards && detailsData.cards.length > 0 ? (
                        <div className="space-y-2">
                          {detailsData.cards.slice(0, 20).map((card: any, index: number) => (
                            <div
                              key={index}
                              className={clsx(
                                'rounded-lg p-3 border text-xs',
                                isDarkMode ? 'bg-kanagawa-ink4 border-kanagawa-ink5' : 'bg-white border-gray-200'
                              )}
                            >
                              <div className="flex items-start justify-between mb-2 gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className={clsx(
                                    'font-medium text-xs leading-tight mb-1 break-words line-clamp-2',
                                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                                  )}>
                                    {(() => {
                                      const cleanedText = cleanCardText(card.front || 'No question');
                                      return cleanedText.length > 80 
                                        ? cleanedText.substring(0, 80) + '...' 
                                        : cleanedText || 'No question';
                                    })()}
                                  </p>
                                  <p className={clsx(
                                    'text-xs leading-tight break-words line-clamp-2',
                                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                                  )}>
                                    {(() => {
                                      const cleanedText = cleanCardText(card.back || 'No answer');
                                      return cleanedText.length > 80 
                                        ? cleanedText.substring(0, 80) + '...' 
                                        : cleanedText || 'No answer';
                                    })()}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                                  <span className={clsx(
                                    'px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                                    getStateColor(card.state)
                                  )}>
                                    {getStateName(card.state)}
                                  </span>
                                  {card.minutesUntilDue !== undefined && (
                                    <span className={clsx(
                                      'text-xs whitespace-nowrap',
                                      isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                                    )}>
                                      Next: {formatNextReviewTime(Math.abs(card.minutesUntilDue))}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs mt-2">
                                <div className="flex space-x-3 min-w-0">
                                  <span className={clsx(
                                    'whitespace-nowrap',
                                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                                  )}>
                                    Reviews: {card.totalReviews || 0}
                                  </span>
                                  <span className={clsx(
                                    'whitespace-nowrap',
                                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                                  )}>
                                    Reps: {card.reps || 0}
                                  </span>
                                </div>
                                {card.difficulty !== undefined && (
                                  <span className={clsx(
                                    'font-medium whitespace-nowrap flex-shrink-0',
                                    card.difficulty >= 8 
                                      ? 'text-red-600' 
                                      : card.difficulty >= 6 
                                      ? 'text-yellow-600' 
                                      : 'text-green-600'
                                  )}>
                                    D: {card.difficulty.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {detailsData.cards.length > 20 && (
                            <div className={clsx(
                              'text-center text-xs py-2',
                              isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                            )}>
                              Showing 20 of {detailsData.cards.length} cards
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={clsx(
                          'text-center py-8 text-xs',
                          isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                        )}>
                          No cards found in this deck
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <ExclamationTriangleIcon className={clsx(
                      'h-5 w-5 mr-2',
                      isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
                    )} />
                    <span className={clsx(
                      'text-sm',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Failed to load detailed statistics
                    </span>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export function StudySession() {
  const { theme } = useAppStore();
  const { getComprehensiveStats, getDeckDetailedStats, startStudySession } = useFlashcardStore();
  
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [expandedDecks, setExpandedDecks] = useState<Set<number>>(new Set());
  const [deckDetails, setDeckDetails] = useState<Map<number, any>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());

  // State for system theme detection
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Load comprehensive stats
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const comprehensiveStats = await getComprehensiveStats();
      setStats(comprehensiveStats);
      setIsLoading(false);
    };

    loadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [getComprehensiveStats]);

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleLoadDeckDetails = async (deckId: number) => {
    if (loadingDetails.has(deckId)) return; // Already loading
    
    console.log('Loading details for deck ID:', deckId);
    setLoadingDetails(prev => new Set([...prev, deckId]));
    
    try {
      const detailsData = await getDeckDetailedStats(deckId);
      console.log('Loaded deck details:', detailsData);
      if (detailsData) {
        setDeckDetails(prev => new Map([...prev, [deckId, detailsData]]));
      } else {
        console.error('No details data returned for deck ID:', deckId);
      }
    } catch (error) {
      console.error('Failed to load deck details for ID', deckId, ':', error);
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(deckId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className={clsx(
        'h-full flex items-center justify-center',
        isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
      )}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className={clsx(
            'text-sm',
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
          )}>
            Loading your study statistics...
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={clsx(
        'h-full flex items-center justify-center',
        isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
      )}>
        <div className="text-center max-w-md">
          <LightBulbIcon className={clsx(
            'mx-auto h-16 w-16 mb-6',
            isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
          )} />
          <h3 className={clsx(
            'text-xl font-semibold mb-4',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Start Your Learning Journey
          </h3>
          <p className={clsx(
            'mb-6',
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
          )}>
            Create some flashcards and start studying to see your progress statistics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'h-full overflow-y-auto',
      isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
    )}>
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={clsx(
            'text-3xl font-bold mb-2',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Study Analytics
          </h1>
          <p className={clsx(
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
          )}>
            Track your learning progress with comprehensive insights
          </p>
        </div>

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Study Streak"
            value={stats.overview.studyStreak}
            subtitle={stats.overview.studyStreak === 1 ? "day" : "days"}
            icon={FireIcon}
            color="orange"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Cards Today"
            value={stats.overview.cardsStudiedToday}
            subtitle="reviewed"
            icon={SparklesIcon}
            color="blue"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Total Study Time"
            value={formatTime(stats.overview.totalStudyTime)}
            subtitle="lifetime"
            icon={ClockIcon}
            color="green"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Retention Rate"
            value={`${stats.overview.avgRetention}%`}
            subtitle="average"
            icon={TrophyIcon}
            color="purple"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Card Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="New Cards"
            value={stats.cardBreakdown.new}
            icon={AcademicCapIcon}
            color="blue"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Learning"
            value={stats.cardBreakdown.learning}
            icon={LightBulbIcon}
            color="orange"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Review"
            value={stats.cardBreakdown.review}
            icon={ArrowTrendingUpIcon}
            color="green"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Due Today"
            value={stats.cardBreakdown.due}
            icon={CalendarDaysIcon}
            color="red"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Mature"
            value={stats.cardBreakdown.mature}
            subtitle=">21 days"
            icon={TrophyIcon}
            color="purple"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Breakdown */}
          <div className={clsx(
            'rounded-2xl p-6 border',
            isDarkMode 
              ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
              : 'bg-white border-gray-200'
          )}>
            <h3 className={clsx(
              'text-lg font-semibold mb-4',
              isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
            )}>
              Performance Breakdown
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Easy', value: stats.performanceStats.easyRate, color: 'bg-green-500' },
                { label: 'Good', value: stats.performanceStats.goodRate, color: 'bg-blue-500' },
                { label: 'Hard', value: stats.performanceStats.hardRate, color: 'bg-yellow-500' },
                { label: 'Again', value: stats.performanceStats.againRate, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={clsx('w-3 h-3 rounded-full', item.color)} />
                    <span className={clsx(
                      'text-sm font-medium',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                    )}>
                      {item.label}
                    </span>
                  </div>
                  <span className={clsx(
                    'text-sm font-semibold',
                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                  )}>
                    {item.value.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Review Statistics */}
          <div className={clsx(
            'rounded-2xl p-6 border',
            isDarkMode 
              ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
              : 'bg-white border-gray-200'
          )}>
            <h3 className={clsx(
              'text-lg font-semibold mb-4',
              isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
            )}>
              Review Activity
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={clsx(
                  'text-sm',
                  isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                )}>
                  Today
                </span>
                <span className={clsx(
                  'text-lg font-semibold',
                  isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                )}>
                  {stats.reviewStats.todayReviews}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={clsx(
                  'text-sm',
                  isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                )}>
                  This Week
                </span>
                <span className={clsx(
                  'text-lg font-semibold',
                  isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                )}>
                  {stats.reviewStats.weekReviews}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={clsx(
                  'text-sm',
                  isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                )}>
                  This Month
                </span>
                <span className={clsx(
                  'text-lg font-semibold',
                  isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                )}>
                  {stats.reviewStats.monthReviews}
                </span>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className={clsx(
                    'text-sm',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                  )}>
                    Average per Day
                  </span>
                  <span className={clsx(
                    'text-lg font-semibold',
                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                  )}>
                    {stats.reviewStats.avgReviewsPerDay}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Deck Performance */}
        {stats && (
          <div className={clsx(
            'rounded-2xl p-6 border',
            isDarkMode 
              ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
              : 'bg-white border-gray-200'
          )}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={clsx(
                  'text-lg font-semibold',
                  isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                )}>
                  Interactive Deck Performance
                </h3>
                <p className={clsx(
                  'text-sm mt-1',
                  isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                )}>
                  Click on any row to view detailed card-level statistics
                </p>
              </div>
              <div className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium',
                isDarkMode ? 'bg-kanagawa-ink5 text-kanagawa-oldwhite' : 'bg-gray-100 text-gray-600'
              )}>
                {stats.deckStats?.length || 0} deck{(stats.deckStats?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={clsx(
                    'text-left border-b',
                    isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200'
                  )}>
                    <th className={clsx(
                      'pb-3 text-sm font-medium',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Deck Name
                    </th>
                    <th className={clsx(
                      'pb-3 text-sm font-medium text-center',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Cards
                    </th>
                    <th className={clsx(
                      'pb-3 text-sm font-medium text-center',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Due
                    </th>
                    <th className={clsx(
                      'pb-3 text-sm font-medium text-center',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Retention
                    </th>
                    <th className={clsx(
                      'pb-3 text-sm font-medium text-center',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Difficulty
                    </th>
                    <th className={clsx(
                      'pb-3 text-sm font-medium text-center',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.deckStats && stats.deckStats.length > 0 ? (
                    stats.deckStats.slice(0, 15).map((deck: any, index: number) => {
                    const deckId = deck.id;
                    const isExpanded = expandedDecks.has(deckId);
                    const detailsData = deckDetails.get(deckId);
                    const isLoadingDetails = loadingDetails.has(deckId);
                    
                    return (
                      <DeckDetailRow
                        key={deckId}
                        deck={deck}
                        isDarkMode={isDarkMode}
                        isExpanded={isExpanded}
                        onToggle={() => {
                          const newExpanded = new Set(expandedDecks);
                          if (isExpanded) {
                            newExpanded.delete(deckId);
                          } else {
                            newExpanded.add(deckId);
                            // Load details if not already loaded
                            if (!detailsData && !isLoadingDetails) {
                              handleLoadDeckDetails(deckId);
                            }
                          }
                          setExpandedDecks(newExpanded);
                        }}
                        detailsData={detailsData}
                        onLoadDetails={() => handleLoadDeckDetails(deckId)}
                        isLoadingDetails={isLoadingDetails}
                      />
                    );
                  })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className={clsx(
                          'text-sm',
                          isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                        )}>
                          No flashcard decks found. Create some flashcards to see performance statistics here.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {stats.deckStats && stats.deckStats.length > 15 && (
              <div className={clsx(
                'text-center text-sm mt-4 py-2 border-t',
                isDarkMode 
                  ? 'text-kanagawa-gray border-kanagawa-ink5' 
                  : 'text-gray-500 border-gray-200'
              )}>
                Showing 15 of {stats.deckStats.length} decks
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}