import { Gamepad2 } from 'lucide-react';

interface BrandProps {
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <a className={`brand ${compact ? 'brand-compact' : ''}`} href="/" aria-label="Discover home">
      <span className="brand-mark">
        <Gamepad2 size={compact ? 24 : 19} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>
            Discover<span>.</span>
          </strong>
          <small>FIND YOUR NEXT WORLD</small>
        </span>
      )}
    </a>
  );
}
