import { Gamepad2 } from 'lucide-react';

interface BrandProps { compact?: boolean }

export function Brand({ compact = false }: BrandProps) {
  return (
    <a className="flex min-w-0 items-center gap-2.5 px-1" href="/" aria-label="Discover home">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        <Gamepad2 size={compact ? 24 : 19} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col">
          <strong className="text-sm leading-tight tracking-tight">Discover.</strong>
          <small className="text-[0.5625rem] font-bold tracking-widest text-muted-foreground">FIND YOUR NEXT WORLD</small>
        </span>
      )}
    </a>
  );
}
