import { Gamepad2 } from 'lucide-react';

export function Brand() {
  return (
    <a className="brand" href="#main-content" aria-label="Discover home">
      <span className="brand-mark">
        <Gamepad2 size={19} strokeWidth={2.3} />
      </span>
      <span className="brand-copy">
        <strong>
          Discover<span>.</span>
        </strong>
        <small>FIND YOUR NEXT WORLD</small>
      </span>
    </a>
  );
}
