import React, { useEffect, useRef } from 'react';

// Cache for home directory to avoid repeated IPC calls
let cachedHomeDir: string | null = null;

// Initialize home directory cache
async function initializeHomeDir(): Promise<void> {
  try {
    if (window.electronAPI?.os?.homedir) {
      cachedHomeDir = await window.electronAPI.os.homedir();
    }
  } catch (error) {
    console.error('Failed to get home directory:', error);
  }
}

// Helper function to convert file paths to custom protocol for media access
function getMediaUrl(src: string): string {
  // If it's already a URL, return as-is
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  
  let absolutePath = src;
  
  // Handle tilde expansion for home directory
  if (src.startsWith('~/')) {
    // If cache is not initialized yet, try to refresh it
    if (cachedHomeDir === null) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Home directory cache not initialized, trying to refresh...');
      }
      initializeHomeDir().then(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Home directory cache refreshed:', cachedHomeDir);
        }
      });
    }
    
    // Use cached home directory or fallback
    const homeDir = cachedHomeDir || '/Users/' + (process.env.USER || 'user');
    absolutePath = src.replace('~', homeDir);
    if (process.env.NODE_ENV === 'development') {
      console.log(`Tilde expansion: ${src} → ${absolutePath} (homeDir: ${homeDir})`);
    }
  }
  
  // Handle relative paths by resolving them relative to the current document
  else if (!absolutePath.startsWith('/')) {
    // Try to get current document path from global window object
    try {
      const currentDoc = (window as any).__lexor_current_document__;
      if (currentDoc) {
        const currentDir = currentDoc.substring(0, currentDoc.lastIndexOf('/'));
        absolutePath = `${currentDir}/${src}`;
      }
    } catch (error) {
      // Could not resolve relative path, no current document available
    }
  }
  
  // If still not an absolute path, return as-is
  if (!absolutePath.startsWith('/')) {
    return src;
  }
  
  // Convert absolute file paths to custom protocol
  const result = `lexor-file://${encodeURIComponent(absolutePath)}`;
  return result;
}

// Initialize home directory cache when the module loads
initializeHomeDir();

interface MediaRendererProps {
  content: string;
  isDarkMode: boolean;
  className?: string;
}

interface ImageComponentProps {
  src: string;
  alt: string;
  title: string;
  isDarkMode: boolean;
}

interface InlineAudioComponentProps {
  src: string;
  title: string;
  isDarkMode: boolean;
}

interface BlockAudioComponentProps {
  src: string;
  title: string;
  isDarkMode: boolean;
}

const ImageComponent: React.FC<ImageComponentProps> = ({ src, alt, title, isDarkMode }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  return (
    <div 
      className="relative my-4 mx-auto max-w-full"
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#2A2A37' : '#f8f9fa'
      }}
    >
      {!isLoaded && !hasError && (
        <div 
          className="flex flex-col items-center justify-center p-12"
          style={{ color: isDarkMode ? '#727169' : '#6b7280' }}
        >
          <div 
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: isDarkMode ? '#727169' : '#6b7280' }}
          />
          <span className="mt-2 text-sm">Loading image...</span>
        </div>
      )}
      
      {hasError && (
        <div className="flex flex-col items-center justify-center p-8">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: isDarkMode ? '#2A2A37' : '#f3f4f6' }}
          >
            <svg width="24" height="24" fill="none" stroke={isDarkMode ? '#e85d75' : '#dc2626'} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-center">
            <div 
              className="font-semibold mb-2"
              style={{ color: isDarkMode ? '#e85d75' : '#dc2626' }}
            >
              Failed to load image
            </div>
            <div 
              className="text-sm"
              style={{ color: isDarkMode ? '#727169' : '#6b7280' }}
            >
              {src}
            </div>
          </div>
        </div>
      )}
      
      <img
        src={getMediaUrl(src)}
        alt={alt}
        title={title}
        className={`max-w-full h-auto transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          display: isLoaded ? 'block' : 'none',
          borderRadius: '12px'
        }}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(false);
        }}
      />
    </div>
  );
};

const InlineAudioComponent: React.FC<InlineAudioComponentProps> = ({ src, title, isDarkMode }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent card flip when clicking audio button
    
    if (!audioRef.current || hasError) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      // Pause any other playing audio
      document.querySelectorAll('audio').forEach(audio => {
        if (audio !== audioRef.current && !audio.paused) {
          audio.pause();
        }
      });
      
      audioRef.current.play().catch((error) => {
        console.error('Audio playback failed:', error);
        setHasError(true);
        setIsLoading(false);
      });
    }
  };

  const playIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  );

  const pauseIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  );

  return (
    <span 
      className="inline-flex items-center gap-1 mx-1 relative align-baseline"
      onClick={(e) => e.stopPropagation()} // Prevent any clicks from bubbling up
    >
      <audio
        ref={audioRef}
        src={getMediaUrl(src)}
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />
      
      <button
        onClick={handlePlay}
        className="inline-flex items-center justify-center transition-all duration-200 hover:scale-105"
        style={{
          width: '1.6em',
          height: '1.2em',
          backgroundColor: isDarkMode ? '#8ea49e' : '#3b82f6',
          color: isDarkMode ? '#000000' : '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.875em'
        }}
        title={title || 'Play audio'}
        aria-label={`Play audio: ${title || 'audio clip'}`}
        disabled={hasError}
      >
        {hasError ? '⚠' : isLoading ? '•' : (isPlaying ? pauseIcon : playIcon)}
      </button>
      
      <div
        className="transition-opacity duration-300"
        style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          backgroundColor: isDarkMode ? '#8ea49e' : '#3b82f6',
          opacity: isPlaying ? 1 : 0,
          marginLeft: '2px'
        }}
      />
    </span>
  );
};

const BlockAudioComponent: React.FC<BlockAudioComponentProps> = ({ src, title, isDarkMode }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent card flip when clicking audio button
    
    if (!audioRef.current || hasError) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current.play().catch((error) => {
        console.error('Audio playback failed:', error);
        setHasError(true);
        setIsLoading(false);
      });
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent card flip when clicking progress bar
    
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audioRef.current.currentTime = percentage * duration;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  );

  const pauseIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  );

  return (
    <div 
      className="my-4 p-4 rounded-xl border"
      style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, #2A2A37 0%, #252535 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderColor: isDarkMode ? '#363646' : '#e5e7eb'
      }}
      onClick={(e) => e.stopPropagation()} // Prevent any clicks from bubbling up
    >
      <audio
        ref={audioRef}
        src={getMediaUrl(src)}
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />
      
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlay}
          className="flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: isDarkMode ? '#8ea49e' : '#3b82f6',
            color: isDarkMode ? '#000000' : '#ffffff',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
          disabled={hasError}
          aria-label="Play/Pause"
        >
          {hasError ? '⚠' : isLoading ? '•' : (isPlaying ? pauseIcon : playIcon)}
        </button>
        
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-1">
            <span 
              className="font-semibold"
              style={{ color: isDarkMode ? '#DCD7BA' : '#393836' }}
            >
              {title || 'Audio File'}
            </span>
            <span style={{ color: isDarkMode ? '#727169' : '#6b7280' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div
            ref={progressRef}
            className="relative h-2 rounded-full cursor-pointer"
            style={{ backgroundColor: isDarkMode ? '#363646' : '#e5e7eb' }}
            onClick={handleProgressClick}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                backgroundColor: isDarkMode ? '#8ea49e' : '#3b82f6',
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
              }}
            />
          </div>
        </div>
      </div>
      
      {hasError && (
        <div 
          className="mt-2 text-sm text-center"
          style={{ color: isDarkMode ? '#e85d75' : '#dc2626' }}
        >
          Error loading audio file
        </div>
      )}
    </div>
  );
};

export const MediaRenderer: React.FC<MediaRendererProps> = ({ content, isDarkMode, className }) => {
  const processContent = (text: string) => {
    const elements: React.ReactElement[] = [];
    let keyCounter = 0;
    let workingText = text;

    // First, extract all multimedia elements and replace them with placeholders
    const mediaElements: { [key: string]: React.ReactElement } = {};

    // Process images: ![alt](src "title")
    const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
    let imageMatch;
    while ((imageMatch = imageRegex.exec(text)) !== null) {
      const placeholder = `__IMAGE_${keyCounter}__`;
      const alt = imageMatch[1] || '';
      const src = imageMatch[2];
      const title = imageMatch[3] || '';
      
      mediaElements[placeholder] = (
        <ImageComponent
          key={`image-${keyCounter}`}
          src={src}
          alt={alt}
          title={title}
          isDarkMode={isDarkMode}
        />
      );
      
      workingText = workingText.replace(imageMatch[0], placeholder);
      keyCounter++;
    }

    // Process block audio: [audio: title](src)
    const blockAudioRegex = /\[audio:\s*([^\]]*)\]\(([^)]+)\)/gi;
    let blockAudioMatch;
    while ((blockAudioMatch = blockAudioRegex.exec(text)) !== null) {
      const placeholder = `__BLOCK_AUDIO_${keyCounter}__`;
      const title = blockAudioMatch[1] || '';
      const src = blockAudioMatch[2];
      
      mediaElements[placeholder] = (
        <BlockAudioComponent
          key={`block-audio-${keyCounter}`}
          src={src}
          title={title}
          isDarkMode={isDarkMode}
        />
      );
      
      workingText = workingText.replace(blockAudioMatch[0], placeholder);
      keyCounter++;
    }

    // Process inline audio: [inline: title](src)
    const inlineAudioRegex = /\[inline:\s*([^\]]*)\]\(([^)]+)\)/gi;
    let inlineAudioMatch;
    while ((inlineAudioMatch = inlineAudioRegex.exec(text)) !== null) {
      const placeholder = `__INLINE_AUDIO_${keyCounter}__`;
      const title = inlineAudioMatch[1] || '';
      const src = inlineAudioMatch[2];
      
      mediaElements[placeholder] = (
        <InlineAudioComponent
          key={`inline-audio-${keyCounter}`}
          src={src}
          title={title}
          isDarkMode={isDarkMode}
        />
      );
      
      workingText = workingText.replace(inlineAudioMatch[0], placeholder);
      keyCounter++;
    }

    // Now split the working text and insert media elements
    const parts = workingText.split(/(__(?:IMAGE|BLOCK_AUDIO|INLINE_AUDIO)_\d+__)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('__') && part.endsWith('__') && mediaElements[part]) {
        return mediaElements[part];
      } else if (part.trim()) {
        return (
          <span
            key={`text-${index}`}
            dangerouslySetInnerHTML={{
              __html: part.replace(/\n/g, '<br />')
            }}
          />
        );
      }
      return null;
    }).filter(Boolean);
  };

  const processedContent = processContent(content);
  
  return (
    <div className={className}>
      {processedContent}
    </div>
  );
};