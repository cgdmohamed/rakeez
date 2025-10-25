import { useState } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';

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

  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
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
        <div className={`flex flex-col items-center justify-center bg-destructive/10 ${className}`}>
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <span className="text-xs text-destructive">Failed to load</span>
        </div>
      );
    }

    if (fallbackType === 'icon') {
      return (
        <div className={`flex items-center justify-center bg-muted ${className}`}>
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      );
    }

    // Default placeholder with alt text
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="text-center p-4">
          <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
          <span className="text-xs text-muted-foreground">{alt}</span>
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
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />
    </div>
  );
}
