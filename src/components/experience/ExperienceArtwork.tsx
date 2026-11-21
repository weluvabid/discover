import { useState } from 'react';
interface ExperienceArtworkProps { src: string; alt: string; className?: string; loading?: 'eager' | 'lazy'; fetchPriority?: 'high' | 'low' | 'auto' }
export function ExperienceArtwork({ src, alt, className = '', loading = 'lazy', fetchPriority = 'auto' }: ExperienceArtworkProps) {
  const [failed, setFailed] = useState(false);
  return <div className={`relative overflow-hidden bg-muted ${className} ${failed ? 'grid place-items-center text-xs font-bold tracking-widest text-muted-foreground' : ''}`}>{!failed ? <img src={src} alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" width={1280} height={720} className="block size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" onError={() => setFailed(true)}/> : <span aria-label="Artwork unavailable">DISCOVER</span>}</div>;
}
