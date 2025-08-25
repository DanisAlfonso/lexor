import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  BookOpenIcon,
  TrophyIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { StudyCard, Rating, StudySession } from '../../../../shared/types/flashcards';
import { useFlashcardStore } from '../../stores/flashcardStore';
import { useAppStore } from '../../stores/appStore';

interface StudyInterfaceProps {
  onComplete?: () => void;
  onExit?: () => void;
}

interface FlashcardDisplayProps {
  card: StudyCard;
  showAnswer: boolean;
  isDarkMode: boolean;
  onShowAnswer: () => void;
  onRate: (rating: Rating) => void;
  currentIndex: number;
  totalCards: number;
}

// Utility function to extract Y rotation angle from transform matrix
const getRotationFromMatrix = (matrix: string): number => {
  if (matrix === 'none' || !matrix) return 0;
  
  const values = matrix.match(/matrix3d\(([^)]+)\)/)?.[1]?.split(',').map(n => parseFloat(n.trim()));
  if (values && values.length === 16) {
    // For rotateY, we need to look at the X and Z components
    // matrix3d format: [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33]
    // For rotateY: m00 = cos(angle), m20 = sin(angle)
    const cos = values[0];  // m00
    const sin = values[8];  // m20
    const radians = Math.atan2(sin, cos);
    return (radians * 180) / Math.PI;
  }
  
  return 0;
};

const FlashcardDisplay: React.FC<FlashcardDisplayProps> = ({
  card,
  showAnswer,
  isDarkMode,
  onShowAnswer,
  onRate,
  currentIndex,
  totalCards
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBackContent, setShowBackContent] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const hasFlippedToBackRef = useRef(false);
  const [wasShowingAnswer, setWasShowingAnswer] = useState(false);

  const monitorRotation = useCallback(() => {
    if (!cardRef.current || !isAnimating) {
      console.log('Monitoring stopped - no card ref or not animating');
      return;
    }
    
    const computedStyle = window.getComputedStyle(cardRef.current);
    const transform = computedStyle.transform;
    const currentAngle = Math.abs(getRotationFromMatrix(transform));
    
    // Log only every ~500ms
    if (Date.now() % 500 < 16) {
      console.log('Current angle:', Math.round(currentAngle), 'isFlipped:', isFlipped, 'showBackContent:', showBackContent);
      
      if (isFlipped) {
        // Forward animation (0° → 180°): Show what's visually displayed
        if (currentAngle < 90) {
          console.log('QUESTION: NORMAL');
        } else {
          console.log('ANSWER: NORMAL');
        }
      } else {
        // Reverse animation (180° → 0°): Show what's visually displayed
        if (currentAngle > 90) {
          // First 90° of reverse (180° → 90°): Show what content is actually visible
          if (showBackContent) {
            console.log('ANSWER: NORMAL');
          } else {
            console.log('QUESTION: MIRRORED');
          }
        } else {
          // Remaining 90° of reverse (90° → 0°): Show what content is actually visible
          if (showBackContent) {
            console.log('ANSWER: MIRRORED');
          } else {
            console.log('QUESTION: NORMAL');
          }
        }
      }
    }
    
    // Forward animation: switch to back content at 90°
    if (isFlipped && currentAngle >= 90 && !showBackContent && !hasFlippedToBackRef.current) {
      console.log('Forward: Switching to back content at angle:', currentAngle);
      hasFlippedToBackRef.current = true;
      setShowBackContent(true);
    }
    
    // Reverse animation: switch from answer to question content at 90°
    if (!isFlipped && currentAngle <= 90 && showBackContent && !hasFlippedToBackRef.current) {
      console.log('Reverse: Switching to question content at angle:', currentAngle);
      setShowBackContent(false);
      hasFlippedToBackRef.current = true;
    }
    
    // Stop when animation is complete
    const isComplete = (isFlipped && currentAngle >= 179) || (!isFlipped && currentAngle <= 1);
    
    if (isComplete) {
      console.log('Animation complete at angle:', currentAngle, 'stopping monitoring');
      setIsAnimating(false);
      if (isFlipped) {
        // Forward animation completed, now showing answer
        setWasShowingAnswer(true);
      } else if (!isFlipped) {
        // Reverse animation completed, reset to question after a brief delay
        setTimeout(() => {
          setShowBackContent(false);
          setWasShowingAnswer(false);
        }, 100);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(monitorRotation);
    }
  }, [isAnimating, showBackContent, isFlipped]);

  useEffect(() => {
    console.log('useEffect triggered - showAnswer:', showAnswer);
    if (showAnswer) {
      console.log('Starting forward animation (question to answer)');
      setIsAnimating(true);
      setIsFlipped(true);
      setShowBackContent(false); // Start with question, will switch to answer at 90°
      hasFlippedToBackRef.current = false;
      setWasShowingAnswer(false);
    } else {
      if (wasShowingAnswer) {
        // This is a reverse animation from answer back to question
        console.log('Starting reverse animation monitoring (answer to question)');
        setIsAnimating(true);
        setIsFlipped(false);
        // Keep showing answer content initially for logging
        // Don't reset wasShowingAnswer yet - let the animation complete first
        hasFlippedToBackRef.current = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }
      } else {
        // This is initial state or reset
        console.log('Resetting to question state');
        setIsAnimating(false);
        setIsFlipped(false);
        setShowBackContent(false);
        hasFlippedToBackRef.current = false;
        setWasShowingAnswer(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }
      }
    }
  }, [showAnswer]);

  // Start monitoring when animation begins (forward or reverse)
  useEffect(() => {
    if (isAnimating) {
      console.log('Starting rotation monitoring for', isFlipped ? 'forward' : 'reverse', 'animation');
      monitorRotation();
    }
  }, [isAnimating, isFlipped, monitorRotation]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleShowAnswer = () => {
    setIsFlipped(true);
    onShowAnswer();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      {/* Progress indicator */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className={isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'}>
            Card {currentIndex + 1} of {totalCards}
          </span>
          <span className={clsx(
            'px-2 py-1 rounded-md text-xs',
            isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-oldwhite' : 'bg-gray-100 text-gray-700'
          )}>
            {card.deck_name}
          </span>
        </div>
        <div className={clsx(
          'w-full bg-opacity-30 rounded-full h-2',
          isDarkMode ? 'bg-kanagawa-ink5' : 'bg-gray-200'
        )}>
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex) / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div 
        className="relative w-full max-w-2xl"
        style={{ perspective: '1200px' }}
      >
        <div
          ref={cardRef}
          className={clsx(
            'relative w-full min-h-[300px] rounded-2xl cursor-pointer',
            isFlipped && 'rotate-y-180'
          )}
          style={{ 
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            transition: 'transform 20000ms ease-out',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            filter: `drop-shadow(0 10px 20px rgba(0, 0, 0, ${isDarkMode ? '0.2' : '0.1'}))`
          }}
          onClick={handleShowAnswer}
        >
          {/* Front of card - only render when not flipped */}
          {!showBackContent && (console.log('Rendering FRONT content') || (
            <div 
              className={clsx(
                'absolute inset-0 w-full h-full rounded-2xl p-8 flex flex-col justify-center',
                isDarkMode 
                  ? 'bg-kanagawa-ink4 border border-kanagawa-ink5' 
                  : 'bg-white border border-gray-200 shadow-sm'
              )}
            >
              <div className="text-center">
                <div className={clsx(
                  'text-sm font-medium mb-4',
                  isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                )}>
                  QUESTION
                </div>
                <div 
                  className={clsx(
                    'text-lg font-medium leading-relaxed',
                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                  )}
                  dangerouslySetInnerHTML={{ 
                    __html: card.front.replace(/\n/g, '<br />') 
                  }}
                />
                
              </div>
            </div>
          ))}

          {/* Back of card - only render when flipped */}
          {showBackContent && (console.log('Rendering BACK content') || (
            <div 
              className={clsx(
                'absolute inset-0 w-full h-full rounded-2xl p-8 flex flex-col justify-center',
                isDarkMode 
                  ? 'bg-kanagawa-ink3 border border-kanagawa-ink4' 
                  : 'bg-gray-50 border border-gray-200 shadow-sm'
              )}
              style={{
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="text-center">
                <div className={clsx(
                  'text-sm font-medium mb-4',
                  isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                )}>
                  ANSWER
                </div>
                <div 
                  className={clsx(
                    'text-lg font-medium leading-relaxed mb-8',
                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                  )}
                  dangerouslySetInnerHTML={{ 
                    __html: card.back.replace(/\n/g, '<br />') 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export const StudyInterface: React.FC<StudyInterfaceProps> = ({
  onComplete = () => {},
  onExit = () => {}
}) => {
  const { theme } = useAppStore();
  const {
    currentSession,
    currentCard,
    showAnswer,
    showCardAnswer,
    reviewCurrentCard,
    nextCard,
    endStudySession
  } = useFlashcardStore();
  
  const [sessionStartTime] = useState<Date>(new Date());
  const [cardsReviewed, setCardsReviewed] = useState(0);
  
  // Determine theme
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!currentCard || !currentSession) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        showCardAnswer();
        break;
      case '1':
        if (showAnswer) {
          handleRate(Rating.Again);
        }
        break;
      case '2':
        if (showAnswer) {
          handleRate(Rating.Hard);
        }
        break;
      case '3':
        if (showAnswer) {
          handleRate(Rating.Good);
        }
        break;
      case '4':
        if (showAnswer) {
          handleRate(Rating.Easy);
        }
        break;
      case 'Escape':
        handleExit();
        break;
    }
  }, [currentCard, currentSession, showAnswer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const handleRate = async (rating: Rating) => {
    await reviewCurrentCard(rating);
    setCardsReviewed(prev => prev + 1);
    
    // Check if session is complete
    if (currentSession && currentSession.current_index >= currentSession.cards.length - 1) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    endStudySession();
    onComplete();
  };

  const handleExit = () => {
    endStudySession();
    onExit();
  };

  if (!currentSession || !currentCard) {
    return (
      <div className={clsx(
        'flex items-center justify-center h-full',
        isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
      )}>
        <div className="text-center">
          <BookOpenIcon className={clsx(
            'mx-auto h-12 w-12 mb-4',
            isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
          )} />
          <h3 className={clsx(
            'text-lg font-medium mb-2',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            No active study session
          </h3>
          <p className={isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'}>
            Select a deck to start studying
          </p>
        </div>
      </div>
    );
  }

  // Check if session is complete
  if (currentSession.current_index >= currentSession.cards.length) {
    const studyTime = Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60);
    
    return (
      <div className={clsx(
        'flex items-center justify-center h-full p-8',
        isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
      )}>
        <div className="text-center max-w-md">
          <TrophyIcon className={clsx(
            'mx-auto h-16 w-16 mb-6',
            'text-yellow-500'
          )} />
          <h2 className={clsx(
            'text-2xl font-bold mb-4',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Study Session Complete!
          </h2>
          <div className={clsx(
            'mb-6 p-4 rounded-xl',
            isDarkMode ? 'bg-kanagawa-ink4' : 'bg-white'
          )}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className={clsx(
                  'font-medium',
                  isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                )}>
                  Cards Reviewed
                </div>
                <div className={clsx(
                  'text-2xl font-bold text-primary-500'
                )}>
                  {cardsReviewed}
                </div>
              </div>
              <div>
                <div className={clsx(
                  'font-medium',
                  isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                )}>
                  Study Time
                </div>
                <div className={clsx(
                  'text-2xl font-bold text-primary-500'
                )}>
                  {studyTime}m
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleComplete}
            className={clsx(
              'px-6 py-3 rounded-lg font-medium transition-colors duration-200',
              isDarkMode 
                ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            )}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'h-full flex flex-col',
      isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
    )}>
      {/* Header */}
      <div className={clsx(
        'flex items-center justify-between p-4 border-b',
        isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200'
      )}>
        <button
          onClick={handleExit}
          className={clsx(
            'flex items-center px-3 py-2 rounded-lg transition-colors duration-200',
            isDarkMode
              ? 'hover:bg-kanagawa-ink4 text-kanagawa-oldwhite'
              : 'hover:bg-gray-100 text-gray-600'
          )}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Exit Study
        </button>

        <div className={clsx(
          'text-sm font-medium',
          isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
        )}>
          Study Session
        </div>

        <div className={clsx(
          'text-sm',
          isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
        )}>
          {cardsReviewed} reviewed
        </div>
      </div>

      {/* Study Interface */}
      <div className="flex-1">
        <FlashcardDisplay
          card={currentCard}
          showAnswer={showAnswer}
          isDarkMode={isDarkMode}
          onShowAnswer={showCardAnswer}
          onRate={handleRate}
          currentIndex={currentSession.current_index}
          totalCards={currentSession.total_cards}
        />
      </div>
    </div>
  );
};
