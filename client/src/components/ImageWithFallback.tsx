import { useState } from 'react';
import { ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackType?: 'placeholder' | 'icon' | 'error';
  onError?: () => void;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackType = 'placeholder',
  onError,
}: ImageWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleRetry = () => {
    setImageError(false);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
  };

  // No src provided or empty
  if (!src || src.trim() === '') {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Image failed to load
  if (imageError) {
    if (fallbackType === 'error') {
      return (
        <div 
          className={`flex flex-col items-center justify-center bg-destructive/10 cursor-pointer hover:bg-destructive/20 transition-colors ${className}`}
          onClick={handleRetry}
          title="Click to retry loading image"
        >
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <span className="text-xs text-destructive">Failed to load</span>
          <RefreshCw className="h-4 w-4 text-destructive/70 mt-1" />
        </div>
      );
    }

    if (fallbackType === 'icon') {
      return (
        <div 
          className={`flex flex-col items-center justify-center gap-1 bg-muted cursor-pointer hover:bg-muted/80 transition-colors ${className}`}
          onClick={handleRetry}
          title="Click to retry loading image"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <RefreshCw className="h-3 w-3 text-muted-foreground/70" />
        </div>
      );
    }

    // Default placeholder with alt text
    return (
      <div 
        className={`flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80 transition-colors ${className}`}
        onClick={handleRetry}
        title="Click to retry loading image"
      >
        <div className="text-center p-4">
          <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
          <span className="text-xs text-muted-foreground">{alt}</span>
          <RefreshCw className="h-4 w-4 text-muted-foreground mx-auto mt-1" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <img
        key={retryCount}
        src={`${src}${src.includes('?') ? '&' : '?'}_retry=${retryCount}`}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />
    </div>
  );
}
