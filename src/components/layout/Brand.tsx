import { GhostMark } from './GhostMark';

interface BrandProps {
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <a
      className={`ghost-link flex min-w-0 items-center gap-2.5 px-1 ${compact ? 'w-full justify-center px-0' : ''}`}
      href="/"
      aria-label="Discover home"
    >
      <GhostMark className="size-8 shrink-0" />
      {!compact && (
        <span className="flex min-w-0 flex-col">
          <strong className="text-sm leading-tight tracking-tight">Discover.</strong>
          <small className="text-[0.5625rem] font-bold tracking-widest text-muted-foreground">
            FIND YOUR NEXT WORLD
          </small>
        </span>
      )}
    </a>
  );
}
