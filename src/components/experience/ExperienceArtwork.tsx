import { useCallback, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react';
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
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const revealDecodedImage = useCallback((image: HTMLImageElement) => {
    const reveal = () => setLoaded(true);

    if (typeof image.decode !== 'function') {
      reveal();

      return;
    }

    void image
      .decode()
      .then(reveal)
      .catch(() => {
        // Some browsers reject decode() even though the loaded image is usable.
        if (image.complete && image.naturalWidth > 0) reveal();
      });
  }, []);

  useLayoutEffect(() => {
    const image = imageRef.current;

    if (!image?.complete) return;

    if (image.naturalWidth > 0) revealDecodedImage(image);
    else setFailed(true);
  }, [revealDecodedImage, src]);

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
        <Skeleton aria-hidden="true" className="absolute inset-0 z-10 size-full rounded-none" />
      )}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        width={1280}
        height={720}
        onLoad={(event: SyntheticEvent<HTMLImageElement>) =>
          revealDecodedImage(event.currentTarget)
        }
        onError={() => setFailed(true)}
        className="relative z-0 block size-full object-cover opacity-100 transition-transform duration-300 group-hover:scale-[1.03]"
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
