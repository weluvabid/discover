import { useState } from 'react';

interface ExperienceArtworkProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export function ExperienceArtwork({
  src,
  alt,
  className = '',
  loading = 'lazy',
}: ExperienceArtworkProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`artwork ${className} ${failed ? 'artwork-fallback' : ''}`}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label="Artwork unavailable">DISCOVER</span>
      )}
    </div>
  );
}
