import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
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
import { MediaRenderer } from './MediaRenderer';

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
  showProgressUI: boolean;
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
  totalCards,
  showProgressUI
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBackContent, setShowBackContent] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const hasFlippedToBackRef = useRef(false);
  const [wasShowingAnswer, setWasShowingAnswer] = useState(false);
  const showBackContentRef = useRef(false);
  const isFlippedRef = useRef(false);
  const isAnimatingRef = useRef(false);

  const monitorRotation = useCallback(() => {
    if (!cardRef.current || !isAnimatingRef.current) {
      return;
    }
    
    const computedStyle = window.getComputedStyle(cardRef.current);
    const transform = computedStyle.transform;
    const currentAngle = Math.abs(getRotationFromMatrix(transform));
    
    // Log only every ~500ms
    if (Date.now() % 500 < 16) {
      
      if (isFlippedRef.current) {
        // Forward animation (0° → 180°): Show what's visually displayed
        if (currentAngle < 90) {
          // QUESTION: NORMAL
        } else {
          // ANSWER: NORMAL
        }
      } else {
        // Reverse animation (180° → 0°): Show what's visually displayed
        if (currentAngle > 90) {
          // First 90° of reverse (180° → 90°): Show what content is actually visible
          if (showBackContentRef.current) {
            // ANSWER: NORMAL
          } else {
            // QUESTION: MIRRORED
          }
        } else {
          // Remaining 90° of reverse (90° → 0°): Show what content is actually visible
          if (showBackContentRef.current) {
            // ANSWER: MIRRORED
          } else {
            // QUESTION: NORMAL
          }
        }
      }
    }
    
    // Forward animation: switch to back content at 90°
    if (isFlippedRef.current && currentAngle >= 90 && !showBackContentRef.current && !hasFlippedToBackRef.current) {
      hasFlippedToBackRef.current = true;
      showBackContentRef.current = true;
      setShowBackContent(true);
    }
    
    // Reverse animation: switch from answer to question content at 90°
    if (!isFlippedRef.current && currentAngle <= 90 && showBackContentRef.current && !hasFlippedToBackRef.current) {
      showBackContentRef.current = false;
      setShowBackContent(false);
      hasFlippedToBackRef.current = true;
    }
    
    // Stop when animation is complete
    const isComplete = (isFlippedRef.current && currentAngle >= 179) || (!isFlippedRef.current && currentAngle <= 1);
    
    if (isComplete) {
      isAnimatingRef.current = false;
      setIsAnimating(false);
      if (isFlippedRef.current) {
        // Forward animation completed, now showing answer
        setWasShowingAnswer(true);
      } else if (!isFlippedRef.current) {
        // Reverse animation completed, reset to question after a brief delay
        setTimeout(() => {
          showBackContentRef.current = false;
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
  }, []);

  useEffect(() => {
    if (showAnswer) {
      isAnimatingRef.current = true;
      isFlippedRef.current = true;
      showBackContentRef.current = false;
      setIsAnimating(true);
      setIsFlipped(true);
      setShowBackContent(false); // Start with question, will switch to answer at 90°
      hasFlippedToBackRef.current = false;
      setWasShowingAnswer(false);
    } else {
      if (wasShowingAnswer) {
        // This is a reverse animation from answer back to question
        isAnimatingRef.current = true;
        isFlippedRef.current = false;
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
        isAnimatingRef.current = false;
        isFlippedRef.current = false;
        showBackContentRef.current = false;
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
      monitorRotation();
    }
  }, [isAnimating, isFlipped]);

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User is selecting text, don't flip the card
      return;
    }
    
    // Check if this was a drag operation (text selection attempt)
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable]') || target.closest('input') || target.closest('textarea')) {
      // Don't flip if clicking on editable content
      return;
    }
    
    // Only flip if the user isn't in the middle of selecting text
    // We check this by seeing if there's a current selection range
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        // There's an active selection, don't flip
        return;
      }
    }
    
    handleShowAnswer();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 min-h-0">
      {/* Progress indicator */}
      <div 
        className={clsx(
          'w-full max-w-4xl transition-all duration-500 ease-out overflow-hidden',
          showProgressUI 
            ? 'mb-6 max-h-20 opacity-100 scale-100' 
            : 'mb-0 max-h-0 opacity-0 scale-95'
        )}
      >
        <div className="transform transition-transform duration-500 ease-out">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className={clsx(
              'transition-all duration-300 ease-out',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600',
              showProgressUI ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}>
              Card {currentIndex + 1} of {totalCards}
            </span>
            <span className={clsx(
              'px-2 py-1 rounded-md text-xs transition-all duration-300 ease-out delay-75',
              isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-oldwhite' : 'bg-gray-100 text-gray-700',
              showProgressUI ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}>
              {card.deck_name}
            </span>
          </div>
          <div className={clsx(
            'w-full bg-opacity-30 rounded-full h-2 transition-all duration-400 ease-out delay-100',
            isDarkMode ? 'bg-kanagawa-ink5' : 'bg-gray-200',
            showProgressUI ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          )}>
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex) / totalCards) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div 
        className="relative w-full max-w-4xl flex-1 min-h-0"
        style={{ perspective: '1200px' }}
      >
        <div
          ref={cardRef}
          className={clsx(
            'relative w-full h-full rounded-2xl',
            isFlipped && 'rotate-y-180'
          )}
          style={{ 
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            transition: 'transform 500ms ease-out',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            filter: `drop-shadow(0 10px 20px rgba(0, 0, 0, ${isDarkMode ? '0.2' : '0.1'}))`,
            minHeight: 'min(60vh, 400px)',
            maxHeight: 'min(80vh, 800px)'
          }}
          onClick={handleCardClick}
        >
          {/* Front of card - only render when not flipped */}
          {!showBackContent && (
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
                <MediaRenderer
                  content={card.front}
                  isDarkMode={isDarkMode}
                  className={clsx(
                    'text-lg font-medium leading-relaxed select-text',
                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                  )}
                />

              </div>
            </div>
          )}

          {/* Back of card - only render when flipped */}
          {showBackContent && (
            <div 
              className={clsx(
                'absolute inset-0 w-full h-full rounded-2xl p-8 flex flex-col justify-center',
                isDarkMode 
                  ? 'bg-kanagawa-ink4 border border-kanagawa-ink5 bg-opacity-95' 
                  : 'bg-gray-50 bg-opacity-60 border border-gray-200 shadow-sm'
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
                <MediaRenderer
                  content={card.back}
                  isDarkMode={isDarkMode}
                  className={clsx(
                    'text-lg font-medium leading-relaxed select-text',
                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                  )}
                />
              </div>
            </div>
          )}
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
    endStudySession,
    completionMessage
  } = useFlashcardStore();
  
  const [sessionStartTime] = useState<Date>(new Date());
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [showProgressUI, setShowProgressUI] = useState(true);
  
  // Set document context for media path resolution
  useEffect(() => {
    if (currentCard && currentCard.source_file) {
      // Set global variable for relative path resolution in media
      (window as any).__lexor_current_document__ = currentCard.source_file;
    }
  }, [currentCard]);
  
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
      case 'i':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setShowProgressUI(prev => !prev);
        }
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        handlePlayAudio();
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
    
    // Note: Session completion is now handled automatically by the nextCard/checkForMoreCards logic
    // The session will end when there are truly no more cards available to study
  };

  const handleComplete = () => {
    endStudySession();
    onComplete();
  };

  const handleExit = () => {
    endStudySession();
    onExit();
  };

  const handlePlayAudio = () => {
    // Find all audio elements on the current flashcard
    const audioElements = document.querySelectorAll('audio');
    
    if (audioElements.length === 0) {
      // No audio found, provide user feedback (could add visual feedback later)
      return;
    }
    
    // First, check if any audio is currently playing and pause it
    let playingAudio = null;
    for (const audio of audioElements) {
      if (!audio.paused) {
        playingAudio = audio;
        break;
      }
    }
    
    if (playingAudio) {
      playingAudio.pause();
      return;
    }
    
    // Find visible audio elements (prioritize audio on the current side of the card)
    const visibleAudioElements = Array.from(audioElements).filter(audio => {
      const container = audio.closest('.absolute'); // Card side container
      if (!container) return true; // If not in a card container, consider it visible
      
      const style = window.getComputedStyle(container);
      return style.display !== 'none' && style.opacity !== '0';
    });
    
    // Use visible audio elements if available, otherwise fall back to all audio elements
    const targetElements = visibleAudioElements.length > 0 ? visibleAudioElements : audioElements;
    
    if (targetElements.length > 0) {
      const targetAudio = targetElements[0];
      targetAudio.play().catch(error => {
        console.error('Failed to play audio:', error);
      });
    }
  };

  if (!currentSession || !currentCard) {
    // Show completion message if available, otherwise default message
    const hasCompletionMessage = !!completionMessage;
    
    return (
      <div className={clsx(
        'flex items-center justify-center h-full',
        isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
      )}>
        <div className="text-center max-w-md mx-auto px-4">
          {hasCompletionMessage ? (
            // Show completion celebration
            <>
              <TrophyIcon className={clsx(
                'mx-auto h-16 w-16 mb-4',
                isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
              )} />
              <div className={clsx(
                'p-4 rounded-lg border-l-4 border-green-400 mb-4',
                isDarkMode 
                  ? 'bg-green-900 bg-opacity-20 text-green-300' 
                  : 'bg-green-50 text-green-700'
              )}>
                <p className="text-sm font-medium">{completionMessage}</p>
              </div>
              <p className={clsx(
                'text-xs mt-4',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                The deck browser will appear automatically, or click "Flashcards" in the sidebar
              </p>
            </>
          ) : (
            // Show default start message  
            <>
              <BookOpenIcon className={clsx(
                'mx-auto h-12 w-12 mb-4',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
              )} />
              <h3 className={clsx(
                'text-lg font-medium mb-2',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                Ready to Study
              </h3>
              <p className={isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'}>
                Select a deck from the browser to start studying
              </p>
            </>
          )}
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
          showProgressUI={showProgressUI}
        />
      </div>
    </div>
  );
};
