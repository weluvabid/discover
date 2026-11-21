import { Gamepad2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExperiencePlayButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function ExperiencePlayButton({
  onClick,
  label = 'Play on Roblox',
  className = '',
}: ExperiencePlayButtonProps) {
  return (
    <Button className={`experience-play-button ${className}`.trim()} onClick={onClick}>
      <Gamepad2 size={16} aria-hidden="true" />
      {label}
      <Play size={13} fill="currentColor" aria-hidden="true" />
    </Button>
  );
}
