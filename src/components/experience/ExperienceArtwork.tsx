import { useState } from 'react';

interface ExperienceArtworkProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function ExperienceArtwork({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
}: ExperienceArtworkProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`artwork ${className} ${failed ? 'artwork-fallback' : ''}`}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          width={1280}
          height={720}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label="Artwork unavailable">DISCOVER</span>
      )}
    </div>
  );
}
