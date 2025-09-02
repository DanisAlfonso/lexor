import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppStore } from '../stores/appStore';

// Configure PDF.js worker - use local copy for offline operation
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Utility functions for PDF position persistence
const getPDFPositionKey = (pdfPath: string) => `pdf-position-${pdfPath}`;

const savePDFPosition = (pdfPath: string, page: number, totalPages: number) => {
  try {
    const positionData = {
      page,
      totalPages,
      timestamp: Date.now()
    };
    localStorage.setItem(getPDFPositionKey(pdfPath), JSON.stringify(positionData));
  } catch (error) {
    console.warn('Failed to save PDF position:', error);
  }
};

const loadPDFPosition = (pdfPath: string) => {
  try {
    const saved = localStorage.getItem(getPDFPositionKey(pdfPath));
    if (saved) {
      const positionData = JSON.parse(saved);
      // Only restore if the data is less than 30 days old
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (positionData.timestamp > thirtyDaysAgo) {
        return positionData;
      }
    }
  } catch (error) {
    console.warn('Failed to load PDF position:', error);
  }
  return null;
};

interface PDFViewerProps {
  pdfPath: string;
}

interface PDFDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPage>;
}

interface PDFPage {
  getViewport: (params: { scale: number }) => PDFViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PDFViewport }) => PDFRenderTask;
}

interface PDFViewport {
  width: number;
  height: number;
}

interface PDFRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

export function PDFViewer({ pdfPath }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<PDFRenderTask | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [baseScale, setBaseScale] = useState(1.0); // For responsive scaling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pan/drag state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 });

  const { 
    theme,
    zoomLevel,
    isFocusMode,
    setZoomLevel 
  } = useAppStore();

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Load PDF document
  useEffect(() => {
    if (!pdfPath) return;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // For local files, we need to read the file as ArrayBuffer first
        let pdfData: ArrayBuffer;
        try {
          // Use Electron's file API to read the PDF as binary data
          const response = await window.electronAPI?.file?.readFileAsBuffer(pdfPath);
          if (!response) {
            throw new Error('Failed to read PDF file as buffer');
          }
          pdfData = response;
        } catch (fileError) {
          // Fallback: try direct URL loading
          console.warn('Failed to read PDF as buffer, trying direct URL:', fileError);
          pdfData = pdfPath as any;
        }
        
        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        
        // Try to restore last page position
        const savedPosition = loadPDFPosition(pdfPath);
        if (savedPosition && savedPosition.page <= pdf.numPages) {
          // Only restore if the saved page is valid for this PDF
          setCurrentPage(savedPosition.page);
        } else {
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfPath]);

  // Calculate scale directly from zoom level - no auto-fitting
  useEffect(() => {
    setScale(zoomLevel / 100);
  }, [zoomLevel]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    // Clear any existing timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }

    let isMounted = true;

    const renderPage = async () => {
      try {
        // Cancel any previous render task
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
        }

        // Check if component is still mounted
        if (!isMounted || !canvasRef.current) return;

        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        if (!canvas || !isMounted) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        // Get device pixel ratio for high-DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Set actual canvas size in memory (scaled by device pixel ratio for sharpness)
        const canvasWidth = viewport.width * devicePixelRatio;
        const canvasHeight = viewport.height * devicePixelRatio;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Set display size (CSS pixels)
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        // Scale the context to match device pixel ratio
        context.scale(devicePixelRatio, devicePixelRatio);
        
        // Clear canvas with white background (PDFs render best on white)
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, viewport.width, viewport.height);

        // Check again before starting render
        if (!isMounted) return;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        try {
          await renderTask.promise;
          
          // Only proceed if still mounted and this is still the current task
          if (!isMounted || renderTaskRef.current !== renderTask) return;
          
          // Clear the render task reference when done
          renderTaskRef.current = null;
          
          // No color manipulation - keep PDF rendering crisp and readable
        } catch (renderError) {
          if (renderError.name === 'RenderingCancelledException') {
            // This is expected when we cancel renders, ignore it
            return;
          }
          throw renderError;
        }
      } catch (err) {
        if (isMounted && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
          setError('Failed to render PDF page');
        }
      }
    };

    // Debounce the render to prevent rapid re-renders during navigation
    renderTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        renderPage();
      }
    }, 50); // 50ms debounce

    // Cleanup function to cancel render task on unmount or dependency change
    return () => {
      isMounted = false;
      
      // Clear timeout
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
      
      // Cancel render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale, isDarkMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setCurrentPage(prev => Math.max(1, prev - 1));
          break;
        case 'ArrowDown': 
        case 'j':
          e.preventDefault();
          setCurrentPage(prev => Math.min(totalPages, prev + 1));
          break;
        case 'Home':
        case 'g':
          if (e.key === 'g' && !e.ctrlKey) {
            e.preventDefault();
            setCurrentPage(1);
          }
          break;
        case 'End':
        case 'G':
          e.preventDefault();
          setCurrentPage(totalPages);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only handle zoom when Ctrl/Cmd is held
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Calculate zoom delta (much more gradual)
        const delta = e.deltaY > 0 ? -5 : 5; // Smaller increments for smoother zooming
        const newZoomLevel = Math.max(25, Math.min(300, zoomLevel + delta));
        
        setZoomLevel(newZoomLevel);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [zoomLevel, setZoomLevel]);

  // Pan/drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging on left mouse button and not when zooming
    if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastPanOffset(panOffset);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPanOffset({
        x: lastPanOffset.x + deltaX,
        y: lastPanOffset.y + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Reset pan when page changes or zoom changes significantly
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [currentPage]);

  // Reset pan when zoom level changes significantly (optional)
  useEffect(() => {
    // Only reset pan on significant zoom changes to avoid jarring experience
    setPanOffset(prevOffset => ({
      x: prevOffset.x * 0.8, // Gradually reduce offset instead of reset
      y: prevOffset.y * 0.8
    }));
  }, [scale]);

  // Save current page position whenever it changes
  useEffect(() => {
    if (pdfPath && currentPage && totalPages) {
      // Debounce saving to avoid excessive localStorage writes
      const timeoutId = setTimeout(() => {
        savePDFPosition(pdfPath, currentPage, totalPages);
      }, 500); // Wait 500ms after last page change

      return () => clearTimeout(timeoutId);
    }
  }, [pdfPath, currentPage, totalPages]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${
        isDarkMode ? 'bg-kanagawa-ink3 text-kanagawa-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${
        isDarkMode ? 'bg-kanagawa-ink3 text-red-400' : 'bg-gray-50 text-red-600'
      }`}>
        <div className="text-center">
          <p className="text-lg mb-2">⚠️ Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`h-full w-full overflow-auto flex flex-col ${
        isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
      }`}
    >
      {/* Minimal status bar - only visible when not in focus mode */}
      {!isFocusMode && (
        <div className={`flex items-center justify-center py-2 px-4 border-b ${
          isDarkMode 
            ? 'bg-kanagawa-ink4 border-kanagawa-ink6 text-kanagawa-white' 
            : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <span className="text-sm">
            Page {currentPage} of {totalPages} • {Math.round(scale * 100)}%
          </span>
        </div>
      )}

      {/* PDF Canvas Container */}
      <div 
        className="flex-1 overflow-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div className="min-h-full flex items-start justify-center p-4">
          <div 
            className={`shadow-lg rounded-sm transition-transform ${
              isDarkMode ? 'shadow-black/50 bg-kanagawa-ink4' : 'shadow-gray-300 bg-white'
            }`}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center'
            }}
          >
            <canvas 
              ref={canvasRef}
              className="block rounded-sm"
              style={{ 
                backgroundColor: 'white', // Always white for PDF rendering quality
                // Use CSS filter for dark mode with softer background
                filter: isDarkMode 
                  ? 'invert(0.9) hue-rotate(180deg) brightness(1.1) contrast(1.0)' 
                  : 'none',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}