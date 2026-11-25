import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ExperienceArtworkProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

interface ArtworkImageProps extends Omit<ExperienceArtworkProps, 'src'> {
  src: string;
}

function ArtworkImage({ src, alt, loading, fetchPriority }: ArtworkImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={`${alt} unavailable`}
        className="absolute inset-0 grid place-items-center bg-muted text-xs font-bold tracking-widest text-muted-foreground"
      >
        DISCOVER
      </span>
    );
  }

  return (
    <>
      {!loaded && (
        <Skeleton aria-hidden="true" className="absolute inset-0 size-full rounded-none" />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        width={1280}
        height={720}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`block size-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.03] ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}

export function ExperienceArtwork({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
}: ExperienceArtworkProps) {
  const safeSrc = typeof src === 'string' && src.trim().length > 0 ? src : null;

  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {safeSrc ? (
        <ArtworkImage
          key={safeSrc}
          src={safeSrc}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
        />
      ) : (
        <span
          role="img"
          aria-label={`${alt} unavailable`}
          className="absolute inset-0 grid place-items-center bg-muted text-xs font-bold tracking-widest text-muted-foreground"
        >
          DISCOVER
        </span>
      )}
    </div>
  );
}
